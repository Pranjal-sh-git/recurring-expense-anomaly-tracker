/**
 * integration.smoke.test.js — Backend Route Mounting & Smoke Test
 *
 * Verifies that:
 * 1. app.js boots cleanly
 * 2. GET / and GET /api/health work without authentication
 * 3. All 4 route modules (/api/auth, /api/transactions, /api/analytics, /api/anomalies) are mounted and live
 * 4. Protected routes return 401 when no token is supplied
 * 5. 404 handler returns 404 for unmapped paths after routes
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'smoke_test_jwt_secret_key_98765';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../app');

let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function get(path, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function post(path, body = {}, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe('Backend Integration & Route Smoke Tests', () => {

  test('GET / - Service overview returns 200 without authentication', async () => {
    const { status, data } = await get('/');
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.healthCheck, '/api/health');
  });

  test('GET /api/health - Public health probe returns 200 without authentication', async () => {
    const { status, data } = await get('/api/health');
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.status, 'healthy');
  });

  test('POST /api/auth/register - Route is mounted and rejects empty body with 400', async () => {
    const { status, data } = await post('/api/auth/register', {});
    assert.equal(status, 400);
    assert.equal(data.success, false);
  });

  test('POST /api/auth/login - Route is mounted and rejects empty credentials with 400', async () => {
    const { status, data } = await post('/api/auth/login', {});
    assert.equal(status, 400);
    assert.equal(data.success, false);
  });

  test('GET /api/auth/me - Route is mounted and protected; rejects unauthenticated request with 401', async () => {
    const { status, data } = await get('/api/auth/me');
    assert.equal(status, 401);
    assert.equal(data.success, false);
  });

  test('GET /api/transactions - Route is mounted and protected; rejects unauthenticated request with 401', async () => {
    const { status, data } = await get('/api/transactions');
    assert.equal(status, 401);
    assert.equal(data.success, false);
  });

  test('GET /api/analytics/summary - Route is mounted and protected; rejects unauthenticated request with 401', async () => {
    const { status, data } = await get('/api/analytics/summary');
    assert.equal(status, 401);
    assert.equal(data.success, false);
  });

  test('GET /api/anomalies - Route is mounted and protected; rejects unauthenticated request with 401', async () => {
    const { status, data } = await get('/api/anomalies');
    assert.equal(status, 401);
    assert.equal(data.success, false);
  });

  test('GET /api/unknown-endpoint - Centralized 404 handler returns 404 after routes', async () => {
    const { status, data } = await get('/api/unknown-endpoint');
    assert.equal(status, 404);
    assert.equal(data.success, false);
    assert.match(data.message, /Resource not found/);
  });

});
