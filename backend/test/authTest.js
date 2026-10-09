/**
 * Automated Test Suite: Authentication, Sessions, and Security
 */
import assert from 'assert';
import pool from '../src/config/db.js';

const API_BASE = 'http://localhost:5001/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, options);
  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return {
    status: res.status,
    headers: res.headers,
    body,
  };
}

function parseCookies(headers) {
  const cookieHeaders = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie')].filter(Boolean);
  const cookies = {};
  for (const str of cookieHeaders) {
    if (!str) continue;
    const parts = str.split(';');
    const [name, val] = parts[0].trim().split('=');
    cookies[name] = val;
  }
  return cookies;
}

async function runAuthTests() {
  console.log('Starting Phase 2 Authentication & Session Automated Test Suite...\n');
  let passCount = 0;

  const testSuffix = Math.floor(Date.now() / 1000);
  const testUser = {
    name: 'Auth Auditor',
    email: `audit_${testSuffix}@example.com`,
    mobile: `9${String(testSuffix).slice(-9)}`,
    password: 'AuditPassword123!',
  };

  try {
    // 1. Registration with valid data
    const regRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    assert.strictEqual(regRes.status, 201, `Expected 201 on register, got ${regRes.status}`);
    assert.strictEqual(regRes.body.status, 'success');
    assert.ok(regRes.body.data.id, 'User ID missing in registration response');
    assert.strictEqual(regRes.body.data.email, testUser.email);
    console.log('  [PASS] 1. Registration with valid credentials succeeds (HTTP 201)');
    passCount++;

    // 2. Reject duplicate email
    const dupEmailRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: testUser.email,
        mobile: `9${String(testSuffix + 1).slice(-9)}`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(dupEmailRes.status, 409, `Expected 409 on duplicate email, got ${dupEmailRes.status}`);
    console.log('  [PASS] 2. Duplicate email rejected (HTTP 409)');
    passCount++;

    // 3. Reject duplicate mobile
    const dupMobileRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: `another_${testSuffix}@example.com`,
        mobile: testUser.mobile,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(dupMobileRes.status, 409, `Expected 409 on duplicate mobile, got ${dupMobileRes.status}`);
    console.log('  [PASS] 3. Duplicate mobile rejected (HTTP 409)');
    passCount++;

    // 4. Reject weak password
    const weakPassRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pass',
        email: `weak_${testSuffix}@example.com`,
        mobile: `9${String(testSuffix + 2).slice(-9)}`,
        password: 'weak',
      }),
    });
    assert.strictEqual(weakPassRes.status, 400, `Expected 400 on weak password, got ${weakPassRes.status}`);
    console.log('  [PASS] 4. Weak password rejected by validator (HTTP 400)');
    passCount++;

    // 5. Login using email
    const loginEmailRes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: testUser.password,
      }),
    });
    assert.strictEqual(loginEmailRes.status, 200, `Expected 200 on login, got ${loginEmailRes.status}`);
    assert.ok(loginEmailRes.body.data.accessToken, 'Access token missing');
    const cookiesAfterLogin = parseCookies(loginEmailRes.headers);
    assert.ok(cookiesAfterLogin.refreshToken, 'HttpOnly refreshToken cookie missing');
    const token1 = loginEmailRes.body.data.accessToken;
    const refresh1 = cookiesAfterLogin.refreshToken;
    console.log('  [PASS] 5. Login using email succeeds with JWT and HttpOnly cookie (HTTP 200)');
    passCount++;

    // 6. Login using mobile
    const loginMobileRes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.mobile,
        password: testUser.password,
      }),
    });
    assert.strictEqual(loginMobileRes.status, 200);
    console.log('  [PASS] 6. Login using mobile number succeeds (HTTP 200)');
    passCount++;

    // 7. Login with invalid password
    const invalidPassRes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        password: 'WrongPassword!',
      }),
    });
    assert.strictEqual(invalidPassRes.status, 401);
    console.log('  [PASS] 7. Invalid password rejected (HTTP 401)');
    passCount++;

    // 8. Protected route GET /api/auth/me with valid Bearer token
    const meRes = await request('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.email, testUser.email);
    console.log('  [PASS] 8. Protected GET /api/auth/me returns profile for valid JWT (HTTP 200)');
    passCount++;

    // 9. Protected route without token
    const noTokenRes = await request('/auth/me', { method: 'GET' });
    assert.strictEqual(noTokenRes.status, 401);
    console.log('  [PASS] 9. Protected GET /api/auth/me rejects missing token (HTTP 401)');
    passCount++;

    // 10. Protected route with malformed header
    const malformedRes = await request('/auth/me', {
      method: 'GET',
      headers: { Authorization: 'BadHeaderToken' },
    });
    assert.strictEqual(malformedRes.status, 401);
    console.log('  [PASS] 10. Protected GET /api/auth/me rejects malformed token header (HTTP 401)');
    passCount++;

    // 11. Refresh token rotation via cookie
    const refreshRes = await request('/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: `refreshToken=${refresh1}`,
      },
    });
    assert.strictEqual(refreshRes.status, 200, `Expected 200 on refresh, got ${refreshRes.status}`);
    const token2 = refreshRes.body.data.accessToken;
    const cookiesAfterRefresh = parseCookies(refreshRes.headers);
    const refresh2 = cookiesAfterRefresh.refreshToken;
    assert.ok(token2, 'New access token missing on refresh');
    assert.ok(refresh2, 'New refresh token cookie missing on rotation');
    assert.notStrictEqual(refresh1, refresh2, 'Refresh token was not rotated!');
    console.log('  [PASS] 11. Token rotation succeeds: issues new access token & new refresh token (HTTP 200)');
    passCount++;

    // 12. Logout revokes session and clears cookie
    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token2}`,
        Cookie: `refreshToken=${refresh2}`,
      },
    });
    assert.strictEqual(logoutRes.status, 200);
    console.log('  [PASS] 12. POST /api/auth/logout revokes session in DB (HTTP 200)');
    passCount++;

    // 13. Accessing /api/auth/me with revoked token's session is rejected
    const revokedAccessRes = await request('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert.strictEqual(revokedAccessRes.status, 401);
    console.log('  [PASS] 13. Access token rejected after session revocation (HTTP 401)');
    passCount++;

    // 14. Presenting revoked refresh token is rejected
    const revokedRefreshRes = await request('/auth/refresh', {
      method: 'POST',
      headers: { Cookie: `refreshToken=${refresh2}` },
    });
    assert.strictEqual(revokedRefreshRes.status, 401);
    console.log('  [PASS] 14. Revoked refresh token rejected (HTTP 401)');
    passCount++;

    console.log(`\nAll ${passCount}/${passCount} Authentication & Session tests PASSED successfully!`);
  } catch (error) {
    console.error('\n[FAIL] Test failure:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runAuthTests();
