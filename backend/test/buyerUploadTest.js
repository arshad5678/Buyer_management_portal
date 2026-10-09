import * as xlsx from 'xlsx';

const BASE_URL = 'http://localhost:5001/api';

/**
 * Helper to create FormData multipart request with native fetch
 */
async function uploadFile(token, filename, buffer, mimeType = 'text/csv') {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';

  let body = Buffer.concat([
    Buffer.from(
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"${crlf}` +
      `Content-Type: ${mimeType}${crlf}${crlf}`
    ),
    buffer,
    Buffer.from(`${crlf}--${boundary}--${crlf}`)
  ]);

  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/buyers/upload`, {
    method: 'POST',
    headers,
    body
  });

  const status = response.status;
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  return { status, data };
}

(async () => {
  console.log('Starting Phase 4.1 Buyer File Upload Automated Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (details) console.error(`         Details: ${details}`);
      process.exit(1);
    }
  }

  // 1. Obtain authenticated token
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'arshad@example.com', password: 'Password@123' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && loginData.data?.accessToken, 'Authenticate user to obtain access token');
  const token = loginData.data.accessToken;

  // 2. Test: Unauthorized request (Missing token)
  const validCsvContent =
    'Name,Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n' +
    'Acme Corp,acme@example.com,9876543210,123 Main St,1000.00,600.00,400.00\n' +
    'Beta LLC,beta@example.com,9123456789,456 Market St,2500.50,2500.50,0.00';
  const validCsvBuffer = Buffer.from(validCsvContent, 'utf8');

  const unauthRes = await uploadFile(null, 'valid.csv', validCsvBuffer, 'text/csv');
  assert(unauthRes.status === 401, 'Unauthorized request rejected (HTTP 401)');

  // 3. Test: Valid CSV Upload
  const validCsvUpload = await uploadFile(token, 'buyers.csv', validCsvBuffer, 'text/csv');
  assert(
    validCsvUpload.status === 201 && validCsvUpload.data?.data?.insertedRows === 2,
    'Valid CSV upload succeeds (HTTP 201, 2 rows inserted)',
    JSON.stringify(validCsvUpload.data)
  );

  // 4. Test: Valid XLSX Upload
  const xlsxRows = [
    {
      'Buyer Name': 'Delta Ltd',
      'Buyer Email': 'delta@example.com',
      'Contact Number': '9876500000',
      'Billing Address': '789 Industrial Rd',
      'Invoice Amount': 5000.00,
      'Paid Amount': 3000.00,
      'Due Amount': 2000.00
    },
    {
      'Buyer Name': 'Echo Ventures',
      'Buyer Email': 'echo@example.com',
      'Contact Number': '9876511111',
      'Billing Address': '101 Tech Park',
      'Invoice Amount': 1500.00,
      'Paid Amount': 1500.00,
      'Due Amount': 0.00
    }
  ];
  const ws = xlsx.utils.json_to_sheet(xlsxRows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Buyers');
  const xlsxBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const validXlsxUpload = await uploadFile(
    token,
    'buyers.xlsx',
    xlsxBuffer,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert(
    validXlsxUpload.status === 201 && validXlsxUpload.data?.data?.insertedRows === 2,
    'Valid XLSX upload succeeds with header variations (HTTP 201, 2 rows inserted)',
    JSON.stringify(validXlsxUpload.data)
  );

  // 5. Test: Unsupported file extension (.txt)
  const txtBuffer = Buffer.from('Some text content', 'utf8');
  const txtUpload = await uploadFile(token, 'test.txt', txtBuffer, 'text/plain');
  assert(txtUpload.status === 415, 'Unsupported file extension rejected (HTTP 415)');

  // 6. Test: Oversized file (> 5 MB)
  const oversizedBuffer = Buffer.alloc(5.2 * 1024 * 1024, 'a');
  const oversizedUpload = await uploadFile(token, 'large.csv', oversizedBuffer, 'text/csv');
  assert(oversizedUpload.status === 413, 'Oversized file exceeding 5MB rejected (HTTP 413)');

  // 7. Test: Empty file (0 bytes)
  const emptyBuffer = Buffer.alloc(0);
  const emptyUpload = await uploadFile(token, 'empty.csv', emptyBuffer, 'text/csv');
  assert(emptyUpload.status === 400, 'Empty file rejected (HTTP 400)');

  // 8. Test: Missing required column (Missing "Name")
  const missingNameCsv =
    'Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n' +
    'john@example.com,9876543210,123 Street,1000.00,500.00,500.00';
  const missingNameUpload = await uploadFile(token, 'noname.csv', Buffer.from(missingNameCsv, 'utf8'), 'text/csv');
  assert(
    missingNameUpload.status === 400 && missingNameUpload.data?.errors?.[0]?.field === 'name',
    'Missing required column "Name" rejected (HTTP 400)'
  );

  // 9. Test: Invalid email format
  const invalidEmailCsv =
    'Name,Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n' +
    'Valid Name,not-an-email,9876543210,123 Street,1000.00,500.00,500.00';
  const invalidEmailUpload = await uploadFile(token, 'bad_email.csv', Buffer.from(invalidEmailCsv, 'utf8'), 'text/csv');
  assert(
    invalidEmailUpload.status === 400 && invalidEmailUpload.data?.errors?.[0]?.field === 'email',
    'Invalid email format rejected with row details (HTTP 400)'
  );

  // 10. Test: Invalid Indian mobile format
  const invalidMobileCsv =
    'Name,Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n' +
    'Valid Name,valid@example.com,12345,123 Street,1000.00,500.00,500.00';
  const invalidMobileUpload = await uploadFile(token, 'bad_mob.csv', Buffer.from(invalidMobileCsv, 'utf8'), 'text/csv');
  assert(
    invalidMobileUpload.status === 400 && invalidMobileUpload.data?.errors?.[0]?.field === 'mobile',
    'Invalid mobile number rejected with row details (HTTP 400)'
  );

  // 11. Test: Invalid monetary value (non-numeric / negative)
  const invalidMoneyCsv =
    'Name,Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n' +
    'Valid Name,valid@example.com,9876543210,123 Street,invalid_amt,500.00,500.00';
  const invalidMoneyUpload = await uploadFile(token, 'bad_money.csv', Buffer.from(invalidMoneyCsv, 'utf8'), 'text/csv');
  assert(
    invalidMoneyUpload.status === 400 && invalidMoneyUpload.data?.errors?.[0]?.field === 'Total Invoice Amount',
    'Invalid monetary value rejected with row details (HTTP 400)'
  );

  // 12. Test: Invoice amount mismatch (Paid + Due != Invoice)
  const mismatchCsv =
    'Name,Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n' +
    'Valid Name,valid@example.com,9876543210,123 Street,1000.00,600.00,200.00';
  const mismatchUpload = await uploadFile(token, 'mismatch.csv', Buffer.from(mismatchCsv, 'utf8'), 'text/csv');
  assert(
    mismatchUpload.status === 400 && mismatchUpload.data?.errors?.[0]?.field === 'total_invoice_amount',
    'Invoice calculation mismatch rejected (Paid + Due != Invoice) (HTTP 400)'
  );

  // 13. Test: Database transaction rollback (All-or-nothing atomicity)
  // Row 1 is valid, Row 2 has an invalid invoice mismatch -> 0 rows must be inserted!
  const atomicCheckCsv =
    'Name,Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n' +
    'Unique Atomic Buyer,atomic@example.com,9876543210,123 Street,1000.00,500.00,500.00\n' +
    'Invalid Second Row,atomic2@example.com,9876543210,123 Street,1000.00,100.00,100.00';
  const atomicUpload = await uploadFile(token, 'atomic.csv', Buffer.from(atomicCheckCsv, 'utf8'), 'text/csv');
  assert(atomicUpload.status === 400, 'Partially invalid file rejected before insertion');

  // Verify in MySQL that "Unique Atomic Buyer" was NOT inserted
  const db = (await import('../src/config/db.js')).default;
  const [atomicRows] = await db.query('SELECT id FROM buyers WHERE name = ?', ['Unique Atomic Buyer']);
  assert(atomicRows.length === 0, 'Database rollback confirmed: 0 rows inserted from invalid file');

  console.log(`\nAll ${passed}/${total} Buyer Upload tests PASSED successfully!`);
  process.exit(0);
})();
