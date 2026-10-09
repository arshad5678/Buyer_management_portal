import csvParser from 'csv-parser';
import * as xlsx from 'xlsx';
import { Readable } from 'stream';
import path from 'path';

const MAX_ALLOWED_ROWS = 5000;

// Mapping of normalized header keys to standard database column keys
const HEADER_MAPPINGS = {
  name: 'name',
  buyername: 'name',
  customername: 'name',
  clientname: 'name',

  email: 'email',
  emailaddress: 'email',
  buyeremail: 'email',

  mobile: 'mobile',
  mobilenumber: 'mobile',
  phone: 'mobile',
  phonenumber: 'mobile',
  contact: 'mobile',
  contactnumber: 'mobile',

  address: 'address',
  buyeraddress: 'address',
  billingaddress: 'address',

  totalinvoiceamount: 'total_invoice_amount',
  invoiceamount: 'total_invoice_amount',
  totalinvoice: 'total_invoice_amount',

  totalamountpaid: 'total_amount_paid',
  amountpaid: 'total_amount_paid',
  paidamount: 'total_amount_paid',

  totalamountdue: 'total_amount_due',
  amountdue: 'total_amount_due',
  dueamount: 'total_amount_due'
};

/**
 * Normalizes an arbitrary header string for matching
 */
const normalizeHeaderKey = (header) => {
  if (typeof header !== 'string') return '';
  return header.toLowerCase().trim().replace(/[\s_.-]+/g, '');
};

/**
 * Normalizes Indian mobile numbers by stripping country code (+91/0) and spaces
 */
const normalizeMobile = (value) => {
  if (value === null || value === undefined) return null;
  let str = String(value).trim().replace(/[\s-]/g, '');
  if (!str) return null;

  if (str.startsWith('+91')) {
    str = str.slice(3);
  } else if (str.startsWith('91') && str.length === 12) {
    str = str.slice(2);
  } else if (str.startsWith('0') && str.length === 11) {
    str = str.slice(1);
  }
  return str;
};

/**
 * Parses and validates monetary fields
 */
const parseMonetaryValue = (rawValue, fieldName, rowNumber, errors) => {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return 0.00;
  }

  const str = String(rawValue).trim();

  // Reject explicitly invalid non-numeric inputs like negative signs, currency symbols, or words
  if (!/^\d+(\.\d+)?$/.test(str)) {
    errors.push({
      row: rowNumber,
      field: fieldName,
      message: `${fieldName} must be a valid non-negative number`
    });
    return null;
  }

  const num = Number(str);
  if (isNaN(num) || num < 0) {
    errors.push({
      row: rowNumber,
      field: fieldName,
      message: `${fieldName} must be a valid non-negative number`
    });
    return null;
  }

  return Number(num.toFixed(2));
};

/**
 * Parses raw CSV buffer into an array of objects
 */
const parseCsvBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(new Error(`Malformed CSV file: ${err.message}`)));
  });
};

/**
 * Parses raw XLS or XLSX buffer into an array of objects
 */
const parseExcelBuffer = (buffer) => {
  try {
    // Disable formulas, HTML, and macros for security
    const workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellFormula: false,
      cellHTML: false,
      cellText: false,
      raw: true
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Workbook contains no sheets');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (!worksheet) {
      throw new Error('First worksheet in workbook is empty');
    }

    return xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  } catch (err) {
    throw new Error(`Invalid or corrupted Excel workbook: ${err.message}`);
  }
};

/**
 * Main service to parse buffer and perform row-level validations
 */
export const parseAndValidateBuyersFile = async (fileBuffer, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  let rawRows = [];

  if (ext === '.csv') {
    rawRows = await parseCsvBuffer(fileBuffer);
  } else if (ext === '.xls' || '.xlsx') {
    rawRows = await parseExcelBuffer(fileBuffer);
  } else {
    throw new Error('Unsupported file extension');
  }

  if (!rawRows || rawRows.length === 0) {
    return {
      isValid: false,
      errors: [{ row: 0, field: 'file', message: 'Uploaded file contains no data rows' }]
    };
  }

  if (rawRows.length > MAX_ALLOWED_ROWS) {
    return {
      isValid: false,
      errors: [
        {
          row: 0,
          field: 'file',
          message: `File exceeds maximum allowed row limit of ${MAX_ALLOWED_ROWS} rows (found ${rawRows.length})`
        }
      ]
    };
  }

  // Determine header mapping from the first row keys
  const firstRow = rawRows[0];
  const originalKeys = Object.keys(firstRow);
  const headerMap = {}; // originalKey -> standardKey
  let hasNameColumn = false;

  for (const origKey of originalKeys) {
    const normalizedKey = normalizeHeaderKey(origKey);
    const mapped = HEADER_MAPPINGS[normalizedKey];
    if (mapped) {
      headerMap[origKey] = mapped;
      if (mapped === 'name') {
        hasNameColumn = true;
      }
    }
  }

  if (!hasNameColumn) {
    return {
      isValid: false,
      errors: [
        {
          row: 1,
          field: 'name',
          message: 'Missing required column: "Name"'
        }
      ]
    };
  }

  const validatedRows = [];
  const errors = [];

  // Validate each row (Row 1 is headers, data rows begin at index 0 => row 2)
  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2;
    const rawRow = rawRows[i];

    // Standardize object based on header map
    const mappedRow = {};
    for (const [origKey, standardKey] of Object.entries(headerMap)) {
      mappedRow[standardKey] = rawRow[origKey];
    }

    // 1. Validate Name (Required, max 150)
    const rawName = mappedRow.name !== undefined ? String(mappedRow.name).trim() : '';
    if (!rawName) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Name is required and cannot be empty'
      });
    } else if (rawName.length > 150) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Name exceeds maximum allowed length of 150 characters'
      });
    }

    // 2. Validate Email (Optional, valid format)
    let email = null;
    if (mappedRow.email !== undefined && mappedRow.email !== null && String(mappedRow.email).trim() !== '') {
      const emailStr = String(mappedRow.email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: `Invalid email address format: "${emailStr}"`
        });
      } else {
        email = emailStr;
      }
    }

    // 3. Validate Mobile (Optional, valid Indian mobile)
    let mobile = null;
    if (mappedRow.mobile !== undefined && mappedRow.mobile !== null && String(mappedRow.mobile).trim() !== '') {
      const cleanedMobile = normalizeMobile(mappedRow.mobile);
      if (!cleanedMobile || !/^[6-9]\d{9}$/.test(cleanedMobile)) {
        errors.push({
          row: rowNum,
          field: 'mobile',
          message: `Invalid Indian mobile number: "${mappedRow.mobile}" (must be 10 digits starting with 6, 7, 8, or 9)`
        });
      } else {
        mobile = cleanedMobile;
      }
    }

    // 4. Address (Optional)
    const address = mappedRow.address !== undefined && mappedRow.address !== null
      ? String(mappedRow.address).trim() || null
      : null;

    // 5. Monetary Fields (Non-negative decimals, default 0.00)
    const totalInvoiceAmount = parseMonetaryValue(mappedRow.total_invoice_amount, 'Total Invoice Amount', rowNum, errors);
    const totalAmountPaid = parseMonetaryValue(mappedRow.total_amount_paid, 'Total Amount Paid', rowNum, errors);
    const totalAmountDue = parseMonetaryValue(mappedRow.total_amount_due, 'Total Amount Due', rowNum, errors);

    // 6. Cross-field Monetary Consistency Check
    if (totalInvoiceAmount !== null && totalAmountPaid !== null && totalAmountDue !== null) {
      const sumPaidAndDue = Number((totalAmountPaid + totalAmountDue).toFixed(2));
      const difference = Math.abs(sumPaidAndDue - totalInvoiceAmount);

      // Tolerance of 0.01 for minor floating point or rounding deviations
      if (difference > 0.01) {
        errors.push({
          row: rowNum,
          field: 'total_invoice_amount',
          message: `Invoice mismatch: Total Amount Paid (${totalAmountPaid.toFixed(2)}) + Total Amount Due (${totalAmountDue.toFixed(2)}) = ${sumPaidAndDue.toFixed(2)}, which does not match Total Invoice Amount (${totalInvoiceAmount.toFixed(2)})`
        });
      }
    }

    if (errors.length === 0) {
      validatedRows.push({
        name: rawName,
        email,
        mobile,
        address,
        total_invoice_amount: totalInvoiceAmount !== null ? totalInvoiceAmount : 0.00,
        total_amount_paid: totalAmountPaid !== null ? totalAmountPaid : 0.00,
        total_amount_due: totalAmountDue !== null ? totalAmountDue : 0.00
      });
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  return {
    isValid: true,
    rows: validatedRows
  };
};

export default {
  parseAndValidateBuyersFile
};
