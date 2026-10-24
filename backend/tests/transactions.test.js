const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const connectDB = require('../config/db');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const transactionRoutes = require('../routes/transactionRoutes');

describe('Transaction API Integration & CRUD Test Suite', () => {
  let server;
  let baseUrl;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret';
  const JWT_SECRET = process.env.JWT_SECRET;

  // Test Users
  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();

  const tokenUserA = jwt.sign({ id: userAId, email: 'usera@example.com' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenUserB = jwt.sign({ id: userBId, email: 'userb@example.com' }, JWT_SECRET, { expiresIn: '1h' });

  // Helper function for API requests
  const apiRequest = async (method, path, body = null, token = tokenUserA) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers
    };
    if (body !== null) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${path}`, options);
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  };

  before(async () => {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Clean up any previous test artifacts and seed authenticated test users
    await Transaction.deleteMany({ user: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    await User.create([
      { _id: userAId, name: 'User A', email: 'usera@example.com', password: 'password123' },
      { _id: userBId, name: 'User B', email: 'userb@example.com', password: 'password123' }
    ]);

    // 3. Create isolated Express test app
    const app = express();
    app.use(express.json());
    app.use('/api/transactions', transactionRoutes);

    // Global error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message
      });
    });

    // 4. Start HTTP server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up created test transactions and users
    await Transaction.deleteMany({ user: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });

    // Close server and database
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (connectDB.disconnectDB) {
      await connectDB.disconnectDB();
    } else {
      await mongoose.disconnect();
    }
  });

  // ─── 1. Authentication & Protection ──────────────────────────────────────────

  test('Rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await apiRequest('GET', '/api/transactions', null, null);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  // ─── 2. Create Transaction (POST /api/transactions) ──────────────────────────

  let createdTxId;

  test('Creates transaction with valid payload, status 201, and exposed id string', async () => {
    const payload = {
      title: 'Groceries Supermarket',
      amount: 145.5,
      category: 'Groceries',
      date: '2026-10-24',
      recurring: false,
      description: 'Weekly food stock'
    };

    const res = await apiRequest('POST', '/api/transactions', payload, tokenUserA);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.id, 'Response must expose an id string');
    assert.strictEqual(typeof res.data.data.id, 'string');
    assert.strictEqual(res.data.data.title, 'Groceries Supermarket');
    assert.strictEqual(res.data.data.amount, 145.5);
    assert.strictEqual(res.data.data.category, 'Groceries');
    assert.strictEqual(res.data.data.recurring, false);

    // Verify ownership matches User A
    assert.strictEqual(res.data.data.userId, userAId);

    createdTxId = res.data.data.id;
  });

  test('Never accepts a user ID from the request body to reassign ownership', async () => {
    const maliciousPayload = {
      user: userBId,
      userId: userBId,
      title: 'Attacking User Ownership',
      amount: 50.0,
      category: 'Other',
      date: '2026-10-24'
    };

    const res = await apiRequest('POST', '/api/transactions', maliciousPayload, tokenUserA);
    assert.strictEqual(res.status, 201);
    // Must remain assigned to User A (from req.user.id)
    assert.strictEqual(res.data.data.userId, userAId);
  });

  test('Rejects transaction creation with missing/empty title (400)', async () => {
    const payload = { title: '   ', amount: 50, category: 'Food', date: '2026-10-24' };
    const res = await apiRequest('POST', '/api/transactions', payload, tokenUserA);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });

  test('Rejects transaction creation with non-positive amount (400)', async () => {
    const zeroRes = await apiRequest('POST', '/api/transactions', { title: 'Test', amount: 0, category: 'Food', date: '2026-10-24' }, tokenUserA);
    assert.strictEqual(zeroRes.status, 400);

    const negRes = await apiRequest('POST', '/api/transactions', { title: 'Test', amount: -25, category: 'Food', date: '2026-10-24' }, tokenUserA);
    assert.strictEqual(negRes.status, 400);

    const nanRes = await apiRequest('POST', '/api/transactions', { title: 'Test', amount: 'not-a-number', category: 'Food', date: '2026-10-24' }, tokenUserA);
    assert.strictEqual(nanRes.status, 400);
  });

  test('Rejects transaction creation with missing category or date (400)', async () => {
    const noCat = await apiRequest('POST', '/api/transactions', { title: 'Test', amount: 10, category: ' ', date: '2026-10-24' }, tokenUserA);
    assert.strictEqual(noCat.status, 400);

    const badDate = await apiRequest('POST', '/api/transactions', { title: 'Test', amount: 10, category: 'Food', date: 'invalid-date' }, tokenUserA);
    assert.strictEqual(badDate.status, 400);
  });

  // ─── 3. List Transactions (GET /api/transactions) ────────────────────────────

  test('Lists transactions scoped to req.user.id with pagination', async () => {
    const res = await apiRequest('GET', '/api/transactions', null, tokenUserA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data.transactions));
    assert.ok(res.data.data.transactions.length >= 2);
    assert.ok(res.data.data.pagination);
    assert.strictEqual(res.data.data.pagination.page, 1);

    // Ensure all returned transactions belong to User A
    for (const tx of res.data.data.transactions) {
      assert.strictEqual(tx.userId, userAId);
    }
  });

  test('Filters transactions by date range (from / to and startDate / endDate)', async () => {
    // Seed transactions with specific dates
    await Transaction.create([
      { user: userAId, title: 'Old Tx', amount: 10, category: 'Food', date: new Date('2026-01-15') },
      { user: userAId, title: 'Mid Tx', amount: 20, category: 'Food', date: new Date('2026-06-15') },
      { user: userAId, title: 'New Tx', amount: 30, category: 'Food', date: new Date('2026-10-01') }
    ]);

    // Test with from / to
    const res = await apiRequest('GET', '/api/transactions?from=2026-05-01&to=2026-07-01', null, tokenUserA);
    assert.strictEqual(res.status, 200);
    const txs = res.data.data.transactions;
    assert.ok(txs.some(t => t.title === 'Mid Tx'));
    assert.ok(!txs.some(t => t.title === 'Old Tx'));
    assert.ok(!txs.some(t => t.title === 'New Tx'));

    // Test with startDate / endDate
    const res2 = await apiRequest('GET', '/api/transactions?startDate=2026-01-01&endDate=2026-02-01', null, tokenUserA);
    assert.strictEqual(res2.status, 200);
    const txs2 = res2.data.data.transactions;
    assert.ok(txs2.some(t => t.title === 'Old Tx'));
    assert.ok(!txs2.some(t => t.title === 'Mid Tx'));
  });

  test('Filters transactions by category', async () => {
    const res = await apiRequest('GET', '/api/transactions?category=Groceries', null, tokenUserA);
    assert.strictEqual(res.status, 200);
    for (const tx of res.data.data.transactions) {
      assert.strictEqual(tx.category, 'Groceries');
    }
  });

  // ─── 4. Fetch Single Transaction (GET /api/transactions/:id) ─────────────────

  test('Fetches a single transaction by ID with 200 and exposed id string', async () => {
    const res = await apiRequest('GET', `/api/transactions/${createdTxId}`, null, tokenUserA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.id, createdTxId);
    assert.strictEqual(res.data.data.title, 'Groceries Supermarket');
  });

  test('Returns 404 for unavailable records (valid ID not in database)', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await apiRequest('GET', `/api/transactions/${nonExistentId}`, null, tokenUserA);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.message, 'Transaction not found');
  });

  // ─── 5. Update Transaction (PUT /api/transactions/:id) ───────────────────────

  test('Updates existing transaction fields and preserves ownership', async () => {
    const updatePayload = {
      title: 'Premium Groceries Supermarket',
      amount: 199.99,
      category: 'Groceries',
      recurring: true,
      user: userBId,   // Attempt to hijack ownership
      userId: userBId
    };

    const res = await apiRequest('PUT', `/api/transactions/${createdTxId}`, updatePayload, tokenUserA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.id, createdTxId);
    assert.strictEqual(res.data.data.title, 'Premium Groceries Supermarket');
    assert.strictEqual(res.data.data.amount, 199.99);
    assert.strictEqual(res.data.data.recurring, true);

    // Ownership MUST NOT be altered
    assert.strictEqual(res.data.data.userId, userAId);
  });

  test('Rejects update with invalid amount or empty title (400)', async () => {
    const badAmount = await apiRequest('PUT', `/api/transactions/${createdTxId}`, { amount: -10 }, tokenUserA);
    assert.strictEqual(badAmount.status, 400);

    const badTitle = await apiRequest('PUT', `/api/transactions/${createdTxId}`, { title: '  ' }, tokenUserA);
    assert.strictEqual(badTitle.status, 400);
  });

  // ─── 6. Delete Transaction (DELETE /api/transactions/:id) ────────────────────

  test('Deletes an existing transaction with 200', async () => {
    // Create temporary transaction to delete
    const tempTx = await Transaction.create({
      user: userAId,
      title: 'To Be Deleted',
      amount: 15,
      category: 'Other',
      date: new Date()
    });

    const res = await apiRequest('DELETE', `/api/transactions/${tempTx._id}`, null, tokenUserA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.id, tempTx._id.toString());

    // Subsequent fetch must return 404
    const verifyFetch = await apiRequest('GET', `/api/transactions/${tempTx._id}`, null, tokenUserA);
    assert.strictEqual(verifyFetch.status, 404);
  });

  // ─── 7. Invalid Mongo IDs ────────────────────────────────────────────────────

  test('Returns 400 for invalid Mongo IDs on GET, PUT, and DELETE', async () => {
    const invalidId = 'not-a-valid-mongo-id';

    const getRes = await apiRequest('GET', `/api/transactions/${invalidId}`, null, tokenUserA);
    assert.strictEqual(getRes.status, 400);
    assert.strictEqual(getRes.data.message, 'Invalid transaction ID format');

    const putRes = await apiRequest('PUT', `/api/transactions/${invalidId}`, { title: 'Update' }, tokenUserA);
    assert.strictEqual(putRes.status, 400);
    assert.strictEqual(putRes.data.message, 'Invalid transaction ID format');

    const delRes = await apiRequest('DELETE', `/api/transactions/${invalidId}`, null, tokenUserA);
    assert.strictEqual(delRes.status, 400);
    assert.strictEqual(delRes.data.message, 'Invalid transaction ID format');
  });

  // ─── 8. Cross-User Ownership Isolation ───────────────────────────────────────

  test('User B cannot read, edit, or delete User A transactions (enforces 404 isolation)', async () => {
    // 1. User B tries to fetch User A's transaction
    const getRes = await apiRequest('GET', `/api/transactions/${createdTxId}`, null, tokenUserB);
    assert.strictEqual(getRes.status, 404, 'User B must not be able to read User A transaction');

    // 2. User B tries to update User A's transaction
    const putRes = await apiRequest('PUT', `/api/transactions/${createdTxId}`, { title: 'Hacked Title' }, tokenUserB);
    assert.strictEqual(putRes.status, 404, 'User B must not be able to edit User A transaction');

    // 3. User B tries to delete User A's transaction
    const delRes = await apiRequest('DELETE', `/api/transactions/${createdTxId}`, null, tokenUserB);
    assert.strictEqual(delRes.status, 404, 'User B must not be able to delete User A transaction');

    // 4. Verify original transaction remains intact
    const original = await Transaction.findById(createdTxId);
    assert.strictEqual(original.title, 'Premium Groceries Supermarket');
    assert.strictEqual(original.user.toString(), userAId);
  });

  // ─── 9. Batch Import (POST /api/transactions/import) ─────────────────────────

  test('Imports batch of valid transactions with 201, scoping all to req.user.id', async () => {
    const batchPayload = {
      transactions: [
        {
          title: 'Electricity Bill',
          amount: 85.0,
          category: 'Utilities',
          date: '2026-10-10',
          recurring: true,
          user: userBId // Attempt to inject cross-user ID
        },
        {
          title: 'Internet Fiber',
          amount: 60.0,
          category: 'Utilities',
          date: '2026-10-12',
          recurring: true
        }
      ]
    };

    const res = await apiRequest('POST', '/api/transactions/import', batchPayload, tokenUserA);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.importedCount, 2);
    assert.strictEqual(res.data.data.transactions.length, 2);

    // Verify all imported transactions belong to User A
    for (const tx of res.data.data.transactions) {
      assert.strictEqual(tx.userId, userAId);
    }
  });

  test('Safely rejects invalid batches before saving, without partial insertion', async () => {
    const invalidBatch = {
      transactions: [
        {
          title: 'Valid Transaction 1',
          amount: 50.0,
          category: 'Food',
          date: '2026-10-20'
        },
        {
          title: 'Bad Amount Transaction',
          amount: -999.0, // Invalid amount
          category: 'Food',
          date: '2026-10-21'
        },
        {
          title: '   ', // Invalid empty title
          amount: 30.0,
          category: 'Transport',
          date: '2026-10-22'
        }
      ]
    };

    const res = await apiRequest('POST', '/api/transactions/import', invalidBatch, tokenUserA);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.errors && res.data.errors.length > 0);

    // Verify that "Valid Transaction 1" was NOT saved to database (all-or-nothing guarantee)
    const found = await Transaction.findOne({ title: 'Valid Transaction 1', user: userAId });
    assert.strictEqual(found, null, 'No transactions should be saved from an invalid batch');
  });

  test('Rejects import with non-array or empty transactions list (400)', async () => {
    const emptyRes = await apiRequest('POST', '/api/transactions/import', { transactions: [] }, tokenUserA);
    assert.strictEqual(emptyRes.status, 400);

    const nonArrayRes = await apiRequest('POST', '/api/transactions/import', { transactions: 'not an array' }, tokenUserA);
    assert.strictEqual(nonArrayRes.status, 400);
  });
});
