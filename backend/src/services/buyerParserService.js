import csvParser from 'csv-parser';
import * as xlsx from 'xlsx';
import { Readable } from 'stream';
import path from 'path';

const MAX_ALLOWED_ROWS = 5000;

// Maps normalized header variants to canonical database column names
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

const normalizeHeaderKey = (header) => {
  if (typeof header !== 'string') return '';
  return header.toLowerCase().trim().replace(/[\s_.-]+/g, '');
};

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

const parseMonetaryValue = (rawValue, fieldName, rowNumber, errors) => {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return 0.00;
  }

  const str = String(rawValue).trim();

  // Reject currency symbols, negative signs, or non-numeric text
  if (!/^\d+(\.\d+)?$/.test(str)) {
    errors.push({ row: rowNumber, field: fieldName, message: `${fieldName} must be a valid non-negative number` });
    return null;
  }

  const num = Number(str);
  if (isNaN(num) || num < 0) {
    errors.push({ row: rowNumber, field: fieldName, message: `${fieldName} must be a valid non-negative number` });
    return null;
  }

  return Number(num.toFixed(2));
};

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

const parseExcelBuffer = (buffer) => {
  try {
    // Disable formula evaluation and HTML rendering for security
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
      errors: [{ row: 0, field: 'file', message: `File exceeds maximum allowed row limit of ${MAX_ALLOWED_ROWS} rows (found ${rawRows.length})` }]
    };
  }

  const firstRow = rawRows[0];
  const originalKeys = Object.keys(firstRow);
  const headerMap = {};
  let hasNameColumn = false;

  for (const origKey of originalKeys) {
    const normalizedKey = normalizeHeaderKey(origKey);
    const mapped = HEADER_MAPPINGS[normalizedKey];
    if (mapped) {
      headerMap[origKey] = mapped;
      if (mapped === 'name') hasNameColumn = true;
    }
  }

  if (!hasNameColumn) {
    return {
      isValid: false,
      errors: [{ row: 1, field: 'name', message: 'Missing required column: "Name"' }]
    };
  }

  const validatedRows = [];
  const errors = [];

  // Row 1 is the header row; data starts at index 0 → displayed as row 2
  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2;
    const rawRow = rawRows[i];

    const mappedRow = {};
    for (const [origKey, standardKey] of Object.entries(headerMap)) {
      mappedRow[standardKey] = rawRow[origKey];
    }

    const rawName = mappedRow.name !== undefined ? String(mappedRow.name).trim() : '';
    if (!rawName) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required and cannot be empty' });
    } else if (rawName.length > 150) {
      errors.push({ row: rowNum, field: 'name', message: 'Name exceeds maximum allowed length of 150 characters' });
    }

    let email = null;
    if (mappedRow.email !== undefined && mappedRow.email !== null && String(mappedRow.email).trim() !== '') {
      const emailStr = String(mappedRow.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        errors.push({ row: rowNum, field: 'email', message: `Invalid email address format: "${emailStr}"` });
      } else {
        email = emailStr;
      }
    }

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

    const address = mappedRow.address !== undefined && mappedRow.address !== null
      ? String(mappedRow.address).trim() || null
      : null;

    const totalInvoiceAmount = parseMonetaryValue(mappedRow.total_invoice_amount, 'Total Invoice Amount', rowNum, errors);
    const totalAmountPaid = parseMonetaryValue(mappedRow.total_amount_paid, 'Total Amount Paid', rowNum, errors);
    const totalAmountDue = parseMonetaryValue(mappedRow.total_amount_due, 'Total Amount Due', rowNum, errors);

    // Cross-field check: Paid + Due must equal Invoice Amount (within 0.01 tolerance for rounding)
    if (totalInvoiceAmount !== null && totalAmountPaid !== null && totalAmountDue !== null) {
      const sumPaidAndDue = Number((totalAmountPaid + totalAmountDue).toFixed(2));
      const difference = Math.abs(sumPaidAndDue - totalInvoiceAmount);

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
    return { isValid: false, errors };
  }

  return { isValid: true, rows: validatedRows };
};

export default { parseAndValidateBuyersFile };
