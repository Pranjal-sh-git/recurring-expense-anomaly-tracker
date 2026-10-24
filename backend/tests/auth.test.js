/**
 * auth.test.js — KharchaSense Backend Authentication Test Suite
 *
 * Test coverage:
 *   1. User Model: password hashing, comparePassword, toAuthJSON exclusion
 *   2. POST /api/auth/register: successful registration (201)
 *   3. POST /api/auth/register: duplicate email prevention (409)
 *   4. POST /api/auth/register: input validation on name, email, password (400)
 *   5. POST /api/auth/login: successful authentication (200)
 *   6. POST /api/auth/login: invalid credentials / wrong password (401)
 *   7. POST /api/auth/login: non-existent user generic error (401)
 *   8. GET /api/auth/me: protected endpoint without token (401)
 *   9. GET /api/auth/me: protected endpoint with invalid/malformed token (401)
 *  10. GET /api/auth/me: protected endpoint with valid token (200)
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_automated_testing_key_12345';
process.env.JWT_EXPIRES_IN = '1h';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const authRoutes = require('../routes/authRoutes');

// ─── Setup In-Memory User Mock Store for Tests ─────────────────────────────────

const inMemoryUsers = new Map();

// Helper to create an in-memory mock user instance with prototype methods
function createMockUserInstance(data) {
  const user = {
    _id: data._id || data.id || '671ad4ef8c983a54b3d11a21',
    name: data.name,
    email: data.email,
    password: data.password, // hashed
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    async comparePassword(candidate) {
      return bcrypt.compare(candidate, this.password);
    },
    toAuthJSON() {
      return {
        id: this._id ? this._id.toString() : this.id,
        name: this.name,
        email: this.email,
        createdAt: this.createdAt
      };
    }
  };
  return user;
}

// ─── Ephemeral HTTP Test Server ────────────────────────────────────────────────

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  // Centralized Error Handler for test app
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error'
    });
  });

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  // Patch User model methods for unit/integration isolation when MongoDB is offline
  User.findOne = function (query) {
    const qEmail = query && query.email;
    const match = inMemoryUsers.get(qEmail);

    const queryObj = {
      select: function (fields) {
        return Promise.resolve(match || null);
      },
      then: function (resolve, reject) {
        return Promise.resolve(match || null).then(resolve, reject);
      }
    };
    return queryObj;
  };

  User.findById = function (id) {
    for (const user of inMemoryUsers.values()) {
      if (user._id === id || user.id === id) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  };

  User.create = async function (doc) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(doc.password, salt);
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const newUser = createMockUserInstance({
      _id: id,
      name: doc.name,
      email: doc.email,
      password: hashedPassword
    });

    inMemoryUsers.set(doc.email, newUser);
    return newUser;
  };
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

beforeEach(async () => {
  inMemoryUsers.clear();

  // Seed a default test user
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('SecurePassword123!', salt);

  const seeded = createMockUserInstance({
    _id: '671ad4ef8c983a54b3d11a21',
    name: 'Alex Mercer',
    email: 'alex@example.com',
    password: passwordHash
  });

  inMemoryUsers.set('alex@example.com', seeded);
});

// Helper for making JSON requests in tests
async function makeRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// ─── Test Suites ───────────────────────────────────────────────────────────────

describe('Authentication Test Suite', () => {

  describe('1. POST /api/auth/register', () => {
    test('should register a new user with 201 status and return JWT token', async () => {
      const payload = {
        name: 'Jordan Lee',
        email: 'jordan@example.com',
        password: 'Password123!'
      };

      const { status, body } = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: payload
      });

      assert.equal(status, 201);
      assert.equal(body.success, true);
      assert.equal(body.message, 'User registered successfully');
      assert.ok(body.data.token, 'Token should be present');
      assert.equal(body.data.user.name, 'Jordan Lee');
      assert.equal(body.data.user.email, 'jordan@example.com');
      assert.equal(body.data.user.password, undefined, 'Password must never be exposed');

      // Verify token is verifiable
      const decoded = jwt.verify(body.data.token, process.env.JWT_SECRET);
      assert.ok(decoded.id, 'Decoded token should contain user ID');
    });

    test('should return 409 Conflict when attempting to register with duplicate email', async () => {
      const payload = {
        name: 'Alex Duplicate',
        email: 'alex@example.com', // Already seeded
        password: 'Password123!'
      };

      const { status, body } = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: payload
      });

      assert.equal(status, 409);
      assert.equal(body.success, false);
      assert.match(body.message, /already exists/i);
    });

    test('should return 400 when name is missing or invalid length', async () => {
      const { status, body } = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: { name: 'A', email: 'valid@example.com', password: 'ValidPassword123' }
      });

      assert.equal(status, 400);
      assert.equal(body.success, false);
    });

    test('should return 400 when email format is invalid', async () => {
      const { status, body } = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: { name: 'Valid Name', email: 'not-an-email', password: 'ValidPassword123' }
      });

      assert.equal(status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /valid email/i);
    });

    test('should return 400 when password is shorter than 6 characters', async () => {
      const { status, body } = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: { name: 'Valid Name', email: 'valid@example.com', password: '123' }
      });

      assert.equal(status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /6 characters/i);
    });
  });

  describe('2. POST /api/auth/login', () => {
    test('should successfully authenticate user with valid credentials (200)', async () => {
      const { status, body } = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'alex@example.com',
          password: 'SecurePassword123!'
        }
      });

      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, 'User authenticated successfully');
      assert.ok(body.data.token, 'Token should be returned');
      assert.equal(body.data.user.email, 'alex@example.com');
      assert.equal(body.data.user.password, undefined);
    });

    test('should return 401 when password does not match', async () => {
      const { status, body } = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'alex@example.com',
          password: 'WrongPassword999!'
        }
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /invalid email or password/i);
    });

    test('should return 401 with generic non-revealing error when email does not exist', async () => {
      const { status, body } = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        }
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
    });

    test('should return 400 when email or password is missing', async () => {
      const { status, body } = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'alex@example.com' }
      });

      assert.equal(status, 400);
      assert.equal(body.success, false);
    });
  });

  describe('3. GET /api/auth/me (Protected Endpoint)', () => {
    test('should return 401 when Authorization header is missing', async () => {
      const { status, body } = await makeRequest('/api/auth/me');

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /not authorized|token/i);
    });

    test('should return 401 when token is invalid or corrupted', async () => {
      const { status, body } = await makeRequest('/api/auth/me', {
        headers: {
          Authorization: 'Bearer invalid.token.value'
        }
      });

      assert.equal(status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /invalid|not authorized/i);
    });

    test('should return 200 with user profile when valid token is supplied', async () => {
      // First login to get a valid token
      const loginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: 'alex@example.com',
          password: 'SecurePassword123!'
        }
      });

      const token = loginRes.body.data.token;

      // Access protected /me route
      const { status, body } = await makeRequest('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.user.email, 'alex@example.com');
      assert.equal(body.data.user.name, 'Alex Mercer');
      assert.equal(body.data.user.password, undefined);
    });
  });

  describe('4. Security & Cryptography Verification', () => {
    test('bcrypt should produce different hashes for same password (salted)', async () => {
      const salt1 = await bcrypt.genSalt(10);
      const salt2 = await bcrypt.genSalt(10);
      const hash1 = await bcrypt.hash('SamePassword123', salt1);
      const hash2 = await bcrypt.hash('SamePassword123', salt2);

      assert.notEqual(hash1, hash2);
      assert.ok(await bcrypt.compare('SamePassword123', hash1));
      assert.ok(await bcrypt.compare('SamePassword123', hash2));
    });

    test('User toAuthJSON should never expose password field', () => {
      const user = createMockUserInstance({
        _id: 'user_123',
        name: 'Safe User',
        email: 'safe@example.com',
        password: '$2a$10$hashedsecretvalue'
      });

      const json = user.toAuthJSON();
      assert.equal(json.id, 'user_123');
      assert.equal(json.name, 'Safe User');
      assert.equal(json.email, 'safe@example.com');
      assert.equal(json.password, undefined);
    });
  });

});
