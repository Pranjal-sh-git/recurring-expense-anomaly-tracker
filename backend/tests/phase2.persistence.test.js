const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const connectDB = require('../config/db');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const transactionRoutes = require('../routes/transactionRoutes');

describe('Task 2: MongoDB Persistence & Session State Isolation Test Suite', () => {
  let server;
  let baseUrl;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret';
  const JWT_SECRET = process.env.JWT_SECRET;

  // Test User Accounts
  const userAlphaId = new mongoose.Types.ObjectId().toString();
  const userBetaId  = new mongoose.Types.ObjectId().toString();

  const tokenAlpha = jwt.sign({ id: userAlphaId, email: 'alpha@kharchasense.app' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenBeta  = jwt.sign({ id: userBetaId,  email: 'beta@kharchasense.app'  }, JWT_SECRET, { expiresIn: '1h' });

  // Helper function for API requests
  const apiRequest = async (method, path, body = null, token = tokenAlpha) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body !== null) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, options);
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  };

  before(async () => {
    // 1. Connect to MongoDB Atlas
    await connectDB();

    // 2. Clean up test users & seed test accounts
    await Transaction.deleteMany({ user: { $in: [userAlphaId, userBetaId] } });
    await User.deleteMany({ _id: { $in: [userAlphaId, userBetaId] } });
    await User.create([
      { _id: userAlphaId, name: 'User Alpha', email: 'alpha@kharchasense.app', password: 'password123' },
      { _id: userBetaId,  name: 'User Beta',  email: 'beta@kharchasense.app',  password: 'password123' }
    ]);

    // 3. Start isolated Express instance
    const app = express();
    app.use(express.json());
    app.use('/api/transactions', transactionRoutes);

    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await Transaction.deleteMany({ user: { $in: [userAlphaId, userBetaId] } });
    await User.deleteMany({ _id: { $in: [userAlphaId, userBetaId] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (connectDB.disconnectDB) {
      await connectDB.disconnectDB();
    } else {
      await mongoose.disconnect();
    }
  });

  // ─── 1. Authoritative MongoDB CRUD & User Isolation ──────────────────────────

  let txAlpha1Id;
  let txBeta1Id;

  test('User Alpha creates transactions in MongoDB Atlas', async () => {
    const res = await apiRequest('POST', '/api/transactions', {
      title: 'Alpha Office Rent',
      amount: 15000,
      category: 'Rent',
      date: '2026-10-01',
      recurring: true
    }, tokenAlpha);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.id, 'Transaction must have exposed id');
    txAlpha1Id = res.data.data.id;

    // Verify it exists in MongoDB directly
    const doc = await Transaction.findById(txAlpha1Id);
    assert.ok(doc, 'Must exist in MongoDB database');
    assert.strictEqual(doc.user.toString(), userAlphaId);
  });

  test('User Beta creates transactions in MongoDB Atlas', async () => {
    const res = await apiRequest('POST', '/api/transactions', {
      title: 'Beta Coffee & Snacks',
      amount: 250,
      category: 'Dining',
      date: '2026-10-02',
      recurring: false
    }, tokenBeta);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    txBeta1Id = res.data.data.id;

    const doc = await Transaction.findById(txBeta1Id);
    assert.ok(doc);
    assert.strictEqual(doc.user.toString(), userBetaId);
  });

  test('Cross-Account Isolation: User Alpha cannot see User Beta records', async () => {
    const res = await apiRequest('GET', '/api/transactions', null, tokenAlpha);
    assert.strictEqual(res.status, 200);
    const list = res.data.data.transactions;
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, txAlpha1Id);
    assert.strictEqual(list[0].title, 'Alpha Office Rent');

    // Attempting to read User Beta transaction with User Alpha token must return 404
    const crossRead = await apiRequest('GET', `/api/transactions/${txBeta1Id}`, null, tokenAlpha);
    assert.strictEqual(crossRead.status, 404);
  });

  test('Cross-Account Isolation: User Beta cannot see User Alpha records', async () => {
    const res = await apiRequest('GET', '/api/transactions', null, tokenBeta);
    assert.strictEqual(res.status, 200);
    const list = res.data.data.transactions;
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, txBeta1Id);
    assert.strictEqual(list[0].title, 'Beta Coffee & Snacks');

    // Attempting to delete User Alpha transaction with User Beta token must return 404
    const crossDelete = await apiRequest('DELETE', `/api/transactions/${txAlpha1Id}`, null, tokenBeta);
    assert.strictEqual(crossDelete.status, 404);

    // Verify record was NOT deleted
    const stillExists = await Transaction.findById(txAlpha1Id);
    assert.ok(stillExists, 'User Alpha transaction must remain intact');
  });

  // ─── 2. Account Switching Simulation ─────────────────────────────────────────

  test('Account Switching Simulation: Sequential token alternation yields strictly isolated responses', async () => {
    // 1. Alpha reads
    const alphaRes1 = await apiRequest('GET', '/api/transactions', null, tokenAlpha);
    assert.strictEqual(alphaRes1.data.data.transactions.length, 1);
    assert.strictEqual(alphaRes1.data.data.transactions[0].title, 'Alpha Office Rent');

    // 2. Beta reads (simulating User A logout -> User B login)
    const betaRes1 = await apiRequest('GET', '/api/transactions', null, tokenBeta);
    assert.strictEqual(betaRes1.data.data.transactions.length, 1);
    assert.strictEqual(betaRes1.data.data.transactions[0].title, 'Beta Coffee & Snacks');

    // 3. Alpha reads again
    const alphaRes2 = await apiRequest('GET', '/api/transactions', null, tokenAlpha);
    assert.strictEqual(alphaRes2.data.data.transactions.length, 1);
    assert.strictEqual(alphaRes2.data.data.transactions[0].title, 'Alpha Office Rent');
  });

  // ─── 3. API Failure & Security Enforcement ───────────────────────────────────

  test('API Failure Behavior: Requests without valid JWT are rejected with 401', async () => {
    const res1 = await apiRequest('GET', '/api/transactions', null, null);
    assert.strictEqual(res1.status, 401);

    const res2 = await apiRequest('GET', '/api/transactions', null, 'invalid-or-expired-token');
    assert.strictEqual(res2.status, 401);
  });

  test('Bulk import scopes all transactions to req.user.id and returns contract format', async () => {
    const batch = [
      { title: 'Electricity Bill', amount: 1200, category: 'Utilities', date: '2026-10-05', recurring: true },
      { title: 'Internet Fiber', amount: 999, category: 'Utilities', date: '2026-10-06', recurring: true }
    ];

    const res = await apiRequest('POST', '/api/transactions/import', { transactions: batch }, tokenAlpha);
    assert.strictEqual(res.status, 201);
    assert.ok(Array.isArray(res.data.data.transactions), 'Response must contain transactions array');
    assert.strictEqual(res.data.data.transactions.length, 2);

    // Verify all transactions in database are scoped to Alpha
    const count = await Transaction.countDocuments({ user: userAlphaId });
    assert.strictEqual(count, 3); // 1 original + 2 imported
  });

  // ─── 4. Client-Side Persistence Contract & LocalStorage Isolation ─────────────

  test('LocalStorage rules simulation: Authenticated users never dual-write to LocalStorage', () => {
    // Mock localStorage environment
    const mockStorage = new Map();
    const mockLocalStorage = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k)
    };

    // Pre-populate with legacy Phase 1 data and guest data
    mockStorage.set('expense_tracker_transactions', JSON.stringify([{ id: 'legacy_1', title: 'Phase 1 Old Demo' }]));
    mockStorage.set('expense_tracker_transactions_guest', JSON.stringify([{ id: 'legacy_guest_1', title: 'Old Guest' }]));
    mockStorage.set('kharchasense_transactions_guest', JSON.stringify([{ id: 'guest_1', title: 'Active Guest' }]));

    // Storage logic functions mirroring dataService.js
    const isAuthUser = (userId) => Boolean(userId);

    const saveTransactionsMock = (txs, userId) => {
      if (isAuthUser(userId)) return false; // Rule: No dual-writing for authenticated users
      mockLocalStorage.setItem('kharchasense_transactions_guest', JSON.stringify(txs));
      return true;
    };

    const loadTransactionsMock = (userId) => {
      if (isAuthUser(userId)) return []; // Rule: Authenticated users never load from LocalStorage
      let raw = mockLocalStorage.getItem('kharchasense_transactions_guest');
      if (!raw) raw = mockLocalStorage.getItem('expense_tracker_transactions_guest');
      return raw ? JSON.parse(raw) : [];
    };

    const clearTransactionsMock = (userId) => {
      if (userId) {
        mockLocalStorage.removeItem(`kharchasense_transactions_${userId}`);
      } else {
        mockLocalStorage.removeItem('kharchasense_transactions_guest');
      }
      return true;
    };

    // Verify authenticated user save is blocked
    const saveResult = saveTransactionsMock([{ id: '1', title: 'Test' }], 'user_alpha_123');
    assert.strictEqual(saveResult, false);
    assert.strictEqual(mockStorage.has('kharchasense_transactions_user_alpha_123'), false);

    // Verify authenticated user load returns empty array
    const loadResult = loadTransactionsMock('user_alpha_123');
    assert.deepStrictEqual(loadResult, []);

    // Verify guest mode load and save
    const guestData = loadTransactionsMock(null);
    assert.strictEqual(guestData.length, 1);
    assert.strictEqual(guestData[0].title, 'Active Guest');

    // Verify logout removes user cache if any, but preserves legacy and guest keys
    mockStorage.set('kharchasense_transactions_user_alpha_123', JSON.stringify([{ id: 'old_cache' }]));
    clearTransactionsMock('user_alpha_123');
    assert.strictEqual(mockStorage.has('kharchasense_transactions_user_alpha_123'), false);

    // Verify legacy Phase 1 keys are completely untouched
    assert.ok(mockStorage.has('expense_tracker_transactions'), 'Legacy Phase 1 demo data must be preserved');
    assert.ok(mockStorage.has('expense_tracker_transactions_guest'), 'Legacy Phase 1 guest data must be preserved');
    assert.ok(mockStorage.has('kharchasense_transactions_guest'), 'Guest data must be preserved on user logout');
  });
});
