/**
 * Phase 4.2 - Buyer Listing, Search & Pagination API Test Suite
 * GET /api/buyers
 *
 * Conventions match the existing buyerUploadTest.js:
 *   - Native fetch (Node 18+)
 *   - assert() helper with process.exit(1) on first failure
 *   - All tests are run sequentially in an async IIFE
 *
 * Prerequisites:
 *   - Backend server running on http://localhost:5001
 *   - A registered user: arshad@example.com / Password@123
 *   - A second registered user: user2@example.com / Password@123
 *     (register automatically in the test if needed)
 *
 * The test uploads a small, controlled set of buyers for user 1 and user 2
 * so results are deterministic and isolated from development data.
 */

const BASE_URL = 'http://localhost:5001/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function apiGet(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${BASE_URL}${path}`, { headers });
  const status = response.status;
  let data = null;
  try { data = await response.json(); } catch (_) { /* empty */ }
  return { status, data };
}

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const status = response.status;
  let data = null;
  try { data = await response.json(); } catch (_) { /* empty */ }
  return { status, data };
}

/** Upload a minimal CSV string on behalf of the given token */
async function uploadCsvRows(token, csvContent) {
  const boundary = '----Boundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';
  const buffer = Buffer.from(csvContent, 'utf8');
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="file"; filename="buyers.csv"${crlf}` +
      `Content-Type: text/csv${crlf}${crlf}`
    ),
    buffer,
    Buffer.from(`${crlf}--${boundary}--${crlf}`)
  ]);
  const response = await fetch(`${BASE_URL}/buyers/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`
    },
    body
  });
  const status = response.status;
  let data = null;
  try { data = await response.json(); } catch (_) { /* empty */ }
  return { status, data };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

(async () => {
  console.log('Starting Phase 4.2 Buyer Listing/Search/Pagination Test Suite...\n');
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

  // ── 0. Auth setup: log in as user 1 ──────────────────────────────────────
  const loginRes1 = await apiPost('/auth/login', {
    identifier: 'arshad@example.com',
    password: 'Password@123'
  });
  assert(
    loginRes1.status === 200 && loginRes1.data?.data?.accessToken,
    'User 1 login succeeds',
    JSON.stringify(loginRes1.data)
  );
  const token1 = loginRes1.data.data.accessToken;

  // ── 0b. Register + log in as user 2 (idempotent) ─────────────────────────
  await apiPost('/auth/register', {
    name: 'Second User',
    email: 'listtest_user2@example.com',
    mobile: '9000000002',
    password: 'Password@123'
  });
  const loginRes2 = await apiPost('/auth/login', {
    identifier: 'listtest_user2@example.com',
    password: 'Password@123'
  });
  assert(
    loginRes2.status === 200 && loginRes2.data?.data?.accessToken,
    'User 2 login succeeds (isolation user)',
    JSON.stringify(loginRes2.data)
  );
  const token2 = loginRes2.data.data.accessToken;

  // ── 0c. Seed buyers for user 1 ────────────────────────────────────────────
  // Insert 15 rows so we can test pagination and search deterministically.
  const header = 'Name,Email,Mobile,Address,Total Invoice Amount,Total Amount Paid,Total Amount Due\n';

  const seedRows = [
    'Arshad Basha,arshad@example.com,9876543210,Guntur,1000.00,600.00,400.00',
    'Bhanu Priya,bhanu@example.com,9876543211,Hyderabad,2000.00,2000.00,0.00',
    'Charlie Brown,charlie@example.com,9876543212,Chennai,3000.00,1500.00,1500.00',
    'Diana Prince,diana@example.com,9876543213,Mumbai,4000.00,4000.00,0.00',
    'Edward Elric,edward@example.com,9876543214,Delhi,5000.00,2500.00,2500.00',
    'Fiona Green,fiona@example.com,9876543215,Pune,6000.00,6000.00,0.00',
    'George Miller,george@example.com,9876543216,Kolkata,7000.00,3500.00,3500.00',
    'Helen Troy,helen@example.com,9876543217,Ahmedabad,8000.00,8000.00,0.00',
    'Ivan Drago,ivan@example.com,9876543218,Jaipur,9000.00,4500.00,4500.00',
    'Julia Roberts,julia@example.com,9876543219,Surat,10000.00,10000.00,0.00',
    'Kumar Das,kumar@example.com,9876543220,Lucknow,1100.00,550.00,550.00',
    'Lakshmi Rao,lakshmi@example.com,9876543221,Kanpur,1200.00,1200.00,0.00',
    'Mohan Lal,mohan@example.com,9876543222,Nagpur,1300.00,650.00,650.00',
    'Nina Simone,nina@example.com,9876543223,Indore,1400.00,1400.00,0.00',
    'Oscar Wilde,oscar@example.com,9876543224,Bhopal,1500.00,750.00,750.00'
  ];

  const seedCsv = header + seedRows.join('\n');
  const seedRes = await uploadCsvRows(token1, seedCsv);
  assert(
    seedRes.status === 201,
    'Seed: 15 buyer rows uploaded for user 1',
    JSON.stringify(seedRes.data)
  );

  // Seed 2 buyers for user 2 (for isolation test)
  const user2Seed = header + 'User2 Buyer,user2buyer@example.com,9000000099,Nowhere,500.00,500.00,0.00';
  const seedRes2 = await uploadCsvRows(token2, user2Seed);
  assert(
    seedRes2.status === 201,
    'Seed: 1 buyer row uploaded for user 2 (isolation)',
    JSON.stringify(seedRes2.data)
  );

  console.log('');

  // ── 1. Missing token → 401 ────────────────────────────────────────────────
  const noTokenRes = await apiGet('/buyers', null);
  assert(noTokenRes.status === 401, 'Missing token returns HTTP 401');

  // ── 2. Invalid / garbage token → 401 ─────────────────────────────────────
  const badTokenRes = await apiGet('/buyers', 'not.a.valid.token');
  assert(badTokenRes.status === 401, 'Invalid token returns HTTP 401');

  // ── 3. Authenticated listing with pagination defaults ─────────────────────
  const listRes = await apiGet('/buyers', token1);
  assert(listRes.status === 200, 'Authenticated GET /api/buyers returns HTTP 200');
  assert(
    listRes.data?.status === 'success',
    'Response body has status: success',
    JSON.stringify(listRes.data)
  );
  assert(
    Array.isArray(listRes.data?.data?.buyers),
    'Response data.buyers is an array'
  );
  const pagination = listRes.data?.data?.pagination;
  assert(
    pagination?.page === 1 && pagination?.limit === 10,
    'Default page=1, limit=10 applied',
    JSON.stringify(pagination)
  );
  assert(
    typeof pagination?.totalRecords === 'number' && pagination.totalRecords >= 15,
    'totalRecords reflects seeded rows',
    JSON.stringify(pagination)
  );
  assert(
    typeof pagination?.totalPages === 'number' && pagination.totalPages >= 2,
    'totalPages is calculated correctly for >=15 records at limit 10',
    JSON.stringify(pagination)
  );
  assert(
    listRes.data.data.buyers.length <= 10,
    'Returned buyers count ≤ limit (10)'
  );

  // ── 4. Sensitive fields must not be present ───────────────────────────────
  const firstBuyer = listRes.data.data.buyers[0];
  assert(
    firstBuyer && !('password_hash' in firstBuyer) && !('refresh_token_hash' in firstBuyer),
    'No sensitive fields (password_hash, refresh_token_hash) in buyer records',
    JSON.stringify(Object.keys(firstBuyer))
  );

  // Expected buyer fields only
  const expectedFields = ['id', 'name', 'email', 'mobile', 'address',
    'total_invoice_amount', 'total_amount_paid', 'total_amount_due'];
  const hasExpectedFields = expectedFields.every((f) => f in firstBuyer);
  assert(hasExpectedFields, 'Buyer records contain all expected fields', JSON.stringify(Object.keys(firstBuyer)));

  // ── 5. Custom page and limit ──────────────────────────────────────────────
  const page2Res = await apiGet('/buyers?page=2&limit=5', token1);
  assert(page2Res.status === 200, 'Custom page=2&limit=5 returns HTTP 200');
  assert(
    page2Res.data?.data?.pagination?.page === 2 &&
    page2Res.data?.data?.pagination?.limit === 5,
    'Response echoes page=2 and limit=5',
    JSON.stringify(page2Res.data?.data?.pagination)
  );
  assert(
    page2Res.data?.data?.buyers?.length <= 5,
    'Page 2 result count ≤ 5'
  );

  // ── 6. Page beyond last page → empty buyers, valid pagination ─────────────
  const farPageRes = await apiGet('/buyers?page=9999&limit=10', token1);
  assert(farPageRes.status === 200, 'Request for page beyond data returns HTTP 200');
  assert(
    Array.isArray(farPageRes.data?.data?.buyers) && farPageRes.data.data.buyers.length === 0,
    'Beyond-last-page returns empty buyers array'
  );

  // ── 7. Empty buyers for a fresh user → empty result ──────────────────────
  // Register a brand-new user who has never uploaded buyers
  await apiPost('/auth/register', {
    name: 'Empty User',
    email: 'listtest_empty@example.com',
    mobile: '9000000003',
    password: 'Password@123'
  });
  const emptyLoginRes = await apiPost('/auth/login', {
    identifier: 'listtest_empty@example.com',
    password: 'Password@123'
  });
  const emptyToken = emptyLoginRes.data?.data?.accessToken;
  const emptyRes = await apiGet('/buyers', emptyToken);
  assert(emptyRes.status === 200, 'User with no buyers returns HTTP 200');
  assert(
    emptyRes.data?.data?.buyers?.length === 0 &&
    emptyRes.data?.data?.pagination?.totalRecords === 0 &&
    emptyRes.data?.data?.pagination?.totalPages === 0,
    'Empty result: 0 buyers, 0 totalRecords, 0 totalPages',
    JSON.stringify(emptyRes.data?.data?.pagination)
  );

  // ── 8. Invalid page parameter ─────────────────────────────────────────────
  const invalidPageRes = await apiGet('/buyers?page=0', token1);
  assert(invalidPageRes.status === 400, 'page=0 returns HTTP 400');

  const negPageRes = await apiGet('/buyers?page=-1', token1);
  assert(negPageRes.status === 400, 'page=-1 returns HTTP 400');

  const strPageRes = await apiGet('/buyers?page=abc', token1);
  assert(strPageRes.status === 400, 'page=abc returns HTTP 400');

  const floatPageRes = await apiGet('/buyers?page=1.5', token1);
  assert(floatPageRes.status === 400, 'page=1.5 returns HTTP 400');

  // ── 9. Invalid limit parameter ────────────────────────────────────────────
  const invalidLimitRes = await apiGet('/buyers?limit=0', token1);
  assert(invalidLimitRes.status === 400, 'limit=0 returns HTTP 400');

  const overLimitRes = await apiGet('/buyers?limit=101', token1);
  assert(overLimitRes.status === 400, 'limit=101 (>100) returns HTTP 400');

  const strLimitRes = await apiGet('/buyers?limit=ten', token1);
  assert(strLimitRes.status === 400, 'limit=ten returns HTTP 400');

  // ── 10. Search by name ────────────────────────────────────────────────────
  const nameRes = await apiGet('/buyers?search=Arshad', token1);
  assert(nameRes.status === 200, 'Search by name returns HTTP 200');
  assert(
    nameRes.data?.data?.buyers?.some((b) => b.name.toLowerCase().includes('arshad')),
    'Search by name "Arshad" returns matching buyer',
    JSON.stringify(nameRes.data?.data?.buyers?.map((b) => b.name))
  );

  // Case-insensitive name search
  const nameLowerRes = await apiGet('/buyers?search=arshad', token1);
  assert(
    nameLowerRes.data?.data?.buyers?.some((b) => b.name.toLowerCase().includes('arshad')),
    'Name search is case-insensitive (arshad matches Arshad)'
  );

  // ── 11. Search by email ───────────────────────────────────────────────────
  const emailRes = await apiGet('/buyers?search=julia%40example.com', token1);
  assert(emailRes.status === 200, 'Search by email returns HTTP 200');
  assert(
    emailRes.data?.data?.buyers?.some((b) => b.email?.includes('julia@example.com')),
    'Search by email "julia@example.com" returns matching buyer',
    JSON.stringify(emailRes.data?.data?.buyers?.map((b) => b.email))
  );

  // ── 12. Search by mobile ──────────────────────────────────────────────────
  const mobileRes = await apiGet('/buyers?search=9876543222', token1);
  assert(mobileRes.status === 200, 'Search by mobile returns HTTP 200');
  assert(
    mobileRes.data?.data?.buyers?.some((b) => b.mobile?.includes('9876543222')),
    'Search by mobile "9876543222" returns matching buyer (Mohan Lal)',
    JSON.stringify(mobileRes.data?.data?.buyers?.map((b) => b.mobile))
  );

  // ── 13. Search combined with pagination ───────────────────────────────────
  // Search "a" will match many names/emails — test that pagination still works
  const searchPageRes = await apiGet('/buyers?search=a&page=1&limit=3', token1);
  assert(searchPageRes.status === 200, 'Search + pagination returns HTTP 200');
  assert(
    searchPageRes.data?.data?.buyers?.length <= 3,
    'Search + pagination: result count ≤ limit (3)',
    JSON.stringify(searchPageRes.data?.data?.pagination)
  );
  assert(
    searchPageRes.data?.data?.pagination?.page === 1 &&
    searchPageRes.data?.data?.pagination?.limit === 3,
    'Search + pagination echoes correct page and limit'
  );

  // ── 14. Search with no matches ────────────────────────────────────────────
  const noMatchRes = await apiGet('/buyers?search=xyzzy_no_match_12345', token1);
  assert(noMatchRes.status === 200, 'Search with no matches returns HTTP 200');
  assert(
    noMatchRes.data?.data?.buyers?.length === 0 &&
    noMatchRes.data?.data?.pagination?.totalRecords === 0,
    'Search with no matches returns empty result with totalRecords=0'
  );

  // ── 15. User isolation: user 2 must NOT see user 1 buyers ─────────────────
  const isolationRes = await apiGet('/buyers', token2);
  assert(isolationRes.status === 200, 'User 2 GET /api/buyers returns HTTP 200');
  const user1Names = seedRows.map((r) => r.split(',')[0]);
  const user2Buyers = isolationRes.data?.data?.buyers || [];
  const leaked = user2Buyers.filter((b) => user1Names.includes(b.name));
  assert(
    leaked.length === 0,
    'User 2 cannot see any of user 1\'s buyers (isolation)',
    `Leaked records: ${JSON.stringify(leaked)}`
  );
  assert(
    user2Buyers.every((b) => b.name === 'User2 Buyer'),
    'User 2 only sees their own buyers'
  );

  // ── 16. SQL injection attempt in search ───────────────────────────────────
  // These should be treated as literal strings (parameterized queries), returning
  // HTTP 200 with 0 results — NOT an error or a database dump.
  const injectionPayloads = [
    "' OR '1'='1",
    "1; DROP TABLE buyers; --",
    "' UNION SELECT 1,2,3,4,5,6,7,8 --",
    "% OR 1=1 --",
    "\\' OR \\'1\\'=\\'1"
  ];

  for (const payload of injectionPayloads) {
    const encodedPayload = encodeURIComponent(payload);
    const injRes = await apiGet(`/buyers?search=${encodedPayload}`, token1);
    assert(
      injRes.status === 200,
      `SQL injection payload returns HTTP 200 (not an error): ${payload}`
    );
    // Result must never expose other users' data
    const injBuyers = injRes.data?.data?.buyers || [];
    const hasOtherUserBuyers = injBuyers.some((b) => b.name === 'User2 Buyer');
    assert(
      !hasOtherUserBuyers,
      `SQL injection does not leak other users' records: ${payload}`,
      JSON.stringify(injBuyers.map((b) => b.name))
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\nAll ${passed}/${total} Buyer Listing/Search/Pagination tests PASSED successfully!`);
  process.exit(0);
})();
