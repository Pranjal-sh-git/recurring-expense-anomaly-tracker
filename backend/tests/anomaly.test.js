/**
 * KharchaSense Backend Anomaly Detection Test Suite
 * 
 * Uses Node.js native test runner (node:test) and assertions (node:assert/strict).
 * Tests all requirements deterministically:
 * - Pure numerical service:
 *   1. Empty datasets and defensive edge cases
 *   2. Insufficient data (< 3 baseline items, sample size <= 3)
 *   3. Zero standard deviation / zero variance (identical baseline amounts)
 *   4. Normal data (all |Z| < 2.0)
 *   5. Extreme amounts / outliers (high and low anomalies with |Z| >= 2.0)
 *   6. Category isolation
 *   7. Summary and severity distribution (critical and moderate)
 * - Controller & routes:
 *   1. Authentication & user isolation (strictly requires req.user.id, no insecure fallbacks)
 *   2. Date range filtering & validation (from/to, startDate/endDate)
 *   3. Flagged-only output by default vs all examined rows
 *   4. Summary endpoint (/api/anomalies/summary)
 *   5. Read-time calculation (no MongoDB writes)
 *   6. Router & canonical protect middleware integration (never bypasses JWT verification based on req.user alone)
 */

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const anomalyService = require('../services/anomalyService');
const anomalyController = require('../controllers/anomalyController');
const anomalyRoutes = require('../routes/anomalyRoutes');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANOMALY SERVICE - PURE NUMERICAL UNIT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('AnomalyService - Pure Numerical Logic', () => {

  describe('1. Empty Datasets & Defensive Edge Cases', () => {
    test('calculateMean handles empty array, null, undefined, non-arrays', () => {
      assert.strictEqual(anomalyService.calculateMean([]), 0);
      assert.strictEqual(anomalyService.calculateMean(null), 0);
      assert.strictEqual(anomalyService.calculateMean(undefined), 0);
      assert.strictEqual(anomalyService.calculateMean('not an array'), 0);
      assert.strictEqual(anomalyService.calculateMean([NaN, null, undefined, 'abc']), 0);
    });

    test('calculateStandardDeviation handles empty, single-item, or non-arrays', () => {
      assert.strictEqual(anomalyService.calculateStandardDeviation([]), 0);
      assert.strictEqual(anomalyService.calculateStandardDeviation([100]), 0);
      assert.strictEqual(anomalyService.calculateStandardDeviation(null), 0);
      assert.strictEqual(anomalyService.calculateStandardDeviation([null, undefined]), 0);
    });

    test('calculateZScore handles zero or invalid standard deviation', () => {
      assert.strictEqual(anomalyService.calculateZScore(100, 100, 0), 0);
      assert.strictEqual(anomalyService.calculateZScore(100, 100, null), 0);
      assert.strictEqual(anomalyService.calculateZScore(100, 100, NaN), 0);
      assert.strictEqual(anomalyService.calculateZScore(NaN, 100, 10), 0);
      assert.strictEqual(anomalyService.calculateZScore(100, NaN, 10), 0);
    });

    test('groupByCategory handles empty and invalid inputs', () => {
      assert.deepStrictEqual(anomalyService.groupByCategory([]), {});
      assert.deepStrictEqual(anomalyService.groupByCategory(null), {});
      assert.deepStrictEqual(anomalyService.groupByCategory([null, undefined, 42]), {});
    });

    test('calculateCategoryStats handles empty dataset', () => {
      assert.deepStrictEqual(anomalyService.calculateCategoryStats([]), {});
      assert.deepStrictEqual(anomalyService.calculateCategoryStats(null), {});
    });

    test('detectAnomalies handles empty dataset', () => {
      assert.deepStrictEqual(anomalyService.detectAnomalies([]), []);
      assert.deepStrictEqual(anomalyService.detectAnomalies(null), []);
      assert.strictEqual(anomalyService.countAnomalies([]), 0);
      assert.deepStrictEqual(anomalyService.getAnomalies([]), []);
    });

    test('getAnomalySummary handles empty dataset', () => {
      const summary = anomalyService.getAnomalySummary([]);
      assert.strictEqual(summary.examinedCount, 0);
      assert.strictEqual(summary.totalTransactions, 0);
      assert.strictEqual(summary.anomalyCount, 0);
      assert.strictEqual(summary.anomalyRate, 0);
      assert.deepStrictEqual(summary.anomalies, []);
      assert.deepStrictEqual(summary.byCategory, {});
      assert.strictEqual(summary.bySeverity.critical, 0);
      assert.strictEqual(summary.bySeverity.moderate, 0);
    });
  });

  describe('2. Insufficient Data (< 3 baseline items per category)', () => {
    test('category with 1 transaction has 0 baseline items and is never flagged', () => {
      const transactions = [
        { id: '1', title: 'Solo Item', amount: 5000, category: 'Luxury', recurring: false }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 1);
      assert.strictEqual(analyzed[0].isAnomaly, false);
      assert.strictEqual(analyzed[0].zScore, 0);
      assert.strictEqual(analyzed[0].anomalyReason, null);
      assert.strictEqual(analyzed[0].categoryMean, 5000);
      assert.strictEqual(analyzed[0].categoryStandardDeviation, 0);
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
    });

    test('category with 2 transactions has 1 baseline item and is never flagged', () => {
      const transactions = [
        { id: '1', title: 'Item A', amount: 100, category: 'Retail' },
        { id: '2', title: 'Item B', amount: 5000, category: 'Retail' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 2);
      assert.strictEqual(analyzed[0].isAnomaly, false);
      assert.strictEqual(analyzed[1].isAnomaly, false);
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
    });

    test('category with 3 transactions has 2 baseline items (< 3) and is never flagged', () => {
      const transactions = [
        { id: '1', title: 'Item 1', amount: 20, category: 'Food' },
        { id: '2', title: 'Item 2', amount: 25, category: 'Food' },
        { id: '3', title: 'Item 3', amount: 5000, category: 'Food' }
      ];

      // Each item has only 2 other items in its baseline (< MIN_BASELINE_COUNT = 3)
      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 3);
      for (const tx of analyzed) {
        assert.strictEqual(tx.isAnomaly, false);
        assert.strictEqual(tx.zScore, 0);
        assert.strictEqual(tx.categoryStandardDeviation, 0);
        assert.strictEqual(tx.anomalyReason, null);
      }
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
    });

    test('corrupt or non-numeric items are ignored and do not count toward baseline', () => {
      const transactions = [
        { id: '1', title: 'Valid 1', amount: 100, category: 'Tech' },
        { id: '2', title: 'Valid 2', amount: 105, category: 'Tech' },
        { id: '3', title: 'Corrupt', amount: 'not-a-number', category: 'Tech' },
        { id: '4', title: 'Null amount', amount: null, category: 'Tech' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 4);
      for (const tx of analyzed) {
        assert.strictEqual(tx.isAnomaly, false);
      }
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
    });
  });

  describe('3. Zero Standard Deviation (Identical Baseline Amounts)', () => {
    test('4 identical amounts produce stdDev=0 in baseline and avoid false positives', () => {
      // 4 items means each has 3 baseline items (meets MIN_BASELINE_COUNT = 3), but stdDev = 0
      const transactions = [
        { id: '1', title: 'Netflix', amount: 199, category: 'Entertainment', recurring: true },
        { id: '2', title: 'Spotify', amount: 199, category: 'Entertainment', recurring: true },
        { id: '3', title: 'YouTube', amount: 199, category: 'Entertainment', recurring: true },
        { id: '4', title: 'Disney+', amount: 199, category: 'Entertainment', recurring: true }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 4);
      for (const tx of analyzed) {
        assert.strictEqual(tx.isAnomaly, false);
        assert.strictEqual(tx.zScore, 0);
        assert.strictEqual(tx.categoryStandardDeviation, 0);
        assert.strictEqual(tx.anomalyReason, null);
      }
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
    });

    test('single outlier with zero-variance baseline avoids division by zero', () => {
      // 3 items of 100 + 1 item of 500:
      // For 500, baseline is [100, 100, 100] (stdDev = 0) -> safely handled, isAnomaly = false
      const transactions = [
        { id: '1', amount: 100, category: 'Fixed' },
        { id: '2', amount: 100, category: 'Fixed' },
        { id: '3', amount: 100, category: 'Fixed' },
        { id: '4', amount: 500, category: 'Fixed' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 4);
      const outlier = analyzed.find(t => t.id === '4');
      assert.strictEqual(outlier.isAnomaly, false);
      assert.strictEqual(outlier.zScore, 0);
      assert.strictEqual(outlier.categoryStandardDeviation, 0);
    });
  });

  describe('4. Normal Data (No Anomalies Flagged)', () => {
    test('transactions within 2 standard deviations are all classified as normal', () => {
      // Values: [15, 20, 30, 40, 45].
      // For each item, leave-one-out baseline of remaining 4 yields |Z| <= 1.953 < 2.0.
      const transactions = [
        { id: '1', title: 'Item 15', amount: 15, category: 'Groceries' },
        { id: '2', title: 'Item 20', amount: 20, category: 'Groceries' },
        { id: '3', title: 'Item 30', amount: 30, category: 'Groceries' },
        { id: '4', title: 'Item 40', amount: 40, category: 'Groceries' },
        { id: '5', title: 'Item 45', amount: 45, category: 'Groceries' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 5);
      for (const tx of analyzed) {
        assert.strictEqual(tx.isAnomaly, false);
        assert.ok(Math.abs(tx.zScore) < 2.0);
        assert.strictEqual(tx.anomalyReason, null);
      }
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
      assert.deepStrictEqual(anomalyService.getAnomalies(transactions), []);
    });
  });

  describe('5. Extreme Amounts (Outliers Detected)', () => {
    test('flags high extreme amount with |Z| >= 2.0 and directional explanation', () => {
      // 4 baseline transactions: [20, 25, 20, 25] -> Mean = 22.5, StdDev = 2.5
      // Outlier transaction: 100 -> Z = (100 - 22.5) / 2.5 = 31.0 >= 2.0
      const transactions = [
        { id: '1', title: 'Snack 1', amount: 20, category: 'Food' },
        { id: '2', title: 'Snack 2', amount: 25, category: 'Food' },
        { id: '3', title: 'Snack 3', amount: 20, category: 'Food' },
        { id: '4', title: 'Snack 4', amount: 25, category: 'Food' },
        { id: '5', title: 'Fancy Dinner', amount: 100, category: 'Food' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 5);

      const outlier = analyzed.find(t => t.id === '5');
      assert.ok(outlier);
      assert.strictEqual(outlier.isAnomaly, true);
      assert.strictEqual(outlier.zScore, 31.0);
      assert.strictEqual(outlier.categoryMean, 22.5);
      assert.strictEqual(outlier.categoryStandardDeviation, 2.5);
      assert.ok(outlier.anomalyReason.includes('Unusually higher'));
      assert.ok(outlier.anomalyReason.includes('"Food"'));
      assert.ok(outlier.anomalyReason.includes('₹100.00'));

      // Check remaining 4 are not anomalies
      const normals = analyzed.filter(t => t.id !== '5');
      for (const n of normals) {
        assert.strictEqual(n.isAnomaly, false);
        assert.ok(Math.abs(n.zScore) < 2.0);
      }

      assert.strictEqual(anomalyService.countAnomalies(transactions), 1);
      const flaggedOnly = anomalyService.getAnomalies(transactions);
      assert.strictEqual(flaggedOnly.length, 1);
      assert.strictEqual(flaggedOnly[0].id, '5');
    });

    test('flags low extreme amount with negative Z-Score (Z <= -2.0)', () => {
      // 4 baseline transactions: [100, 105, 100, 105] -> Mean = 102.5, StdDev = 2.5
      // Low outlier: 10 -> Z = (10 - 102.5) / 2.5 = -37.0 <= -2.0
      const transactions = [
        { id: '1', title: 'Fine Dining 1', amount: 100, category: 'Food' },
        { id: '2', title: 'Fine Dining 2', amount: 105, category: 'Food' },
        { id: '3', title: 'Fine Dining 3', amount: 100, category: 'Food' },
        { id: '4', title: 'Fine Dining 4', amount: 105, category: 'Food' },
        { id: '5', title: 'Vending Snack', amount: 10, category: 'Food' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      const outlier = analyzed.find(t => t.id === '5');
      assert.ok(outlier);
      assert.strictEqual(outlier.isAnomaly, true);
      assert.strictEqual(outlier.zScore, -37.0);
      assert.ok(outlier.anomalyReason.includes('Unusually lower'));
    });

    test('custom threshold parameter is respected', () => {
      // 4 baseline transactions: [20, 30, 20, 30] -> Mean = 25, StdDev = 5
      // Item with amount 37.5 -> Z = (37.5 - 25) / 5 = +2.5
      const transactions = [
        { id: '1', amount: 20, category: 'Food' },
        { id: '2', amount: 30, category: 'Food' },
        { id: '3', amount: 20, category: 'Food' },
        { id: '4', amount: 30, category: 'Food' },
        { id: '5', amount: 37.5, category: 'Food' }
      ];

      // With threshold 3.0, Z=2.5 is NOT flagged
      const highThresh = anomalyService.detectAnomalies(transactions, 3.0);
      assert.strictEqual(highThresh.find(t => t.id === '5').isAnomaly, false);

      // With threshold 2.0, Z=2.5 IS flagged
      const standardThresh = anomalyService.detectAnomalies(transactions, 2.0);
      assert.strictEqual(standardThresh.find(t => t.id === '5').isAnomaly, true);
    });
  });

  describe('6. Category Isolation', () => {
    test('statistical evaluations are completely isolated per category', () => {
      // In 'Coffee': [5, 5, 5, 5] -> identical, stdDev=0 -> 0 anomalies
      // In 'Rent': [15000, 15000, 15000, 15000] -> identical, stdDev=0 -> 0 anomalies
      // In 'Supplies': [20, 25, 20, 25, 100] -> 100 is anomaly (Z=31.0)
      // Even though 15000 is huge compared to 100, Rent does not affect Supplies.
      const transactions = [
        { id: 'c1', title: 'Espresso', amount: 5, category: 'Coffee' },
        { id: 'c2', title: 'Latte', amount: 5, category: 'Coffee' },
        { id: 'c3', title: 'Mocha', amount: 5, category: 'Coffee' },
        { id: 'c4', title: 'Cappuccino', amount: 5, category: 'Coffee' },

        { id: 'r1', title: 'Office Rent Oct', amount: 15000, category: 'Rent' },
        { id: 'r2', title: 'Office Rent Nov', amount: 15000, category: 'Rent' },
        { id: 'r3', title: 'Office Rent Dec', amount: 15000, category: 'Rent' },
        { id: 'r4', title: 'Office Rent Jan', amount: 15000, category: 'Rent' },

        { id: 's1', title: 'Pen', amount: 20, category: 'Supplies' },
        { id: 's2', title: 'Paper', amount: 25, category: 'Supplies' },
        { id: 's3', title: 'Staples', amount: 20, category: 'Supplies' },
        { id: 's4', title: 'Clips', amount: 25, category: 'Supplies' },
        { id: 's5', title: 'Bulk Toner', amount: 100, category: 'Supplies' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 13);

      // Only s5 in 'Supplies' should be flagged
      const anomalies = analyzed.filter(t => t.isAnomaly);
      assert.strictEqual(anomalies.length, 1);
      assert.strictEqual(anomalies[0].id, 's5');
      assert.strictEqual(anomalies[0].category, 'Supplies');

      // Rent should have stdDev=0 and no anomalies
      const rentTx = analyzed.filter(t => t.category === 'Rent');
      assert.strictEqual(rentTx.length, 4);
      assert.strictEqual(rentTx[0].categoryMean, 15000);
      assert.strictEqual(rentTx[0].categoryStandardDeviation, 0);
      assert.strictEqual(rentTx[0].isAnomaly, false);
    });

    test('missing or blank category safely normalizes to "Uncategorized"', () => {
      const transactions = [
        { id: '1', amount: 10, category: '' },
        { id: '2', amount: 10, category: '   ' },
        { id: '3', amount: 10, category: null }
      ];

      const stats = anomalyService.calculateCategoryStats(transactions);
      assert.ok(stats['Uncategorized']);
      assert.strictEqual(stats['Uncategorized'].count, 3);
    });
  });

  describe('7. Comprehensive Summary & Severity Breakdown', () => {
    test('getAnomalySummary computes examinedCount, category, and severity distributions', () => {
      // Outlier 1 in Food: baseline [20, 30, 20, 30] (mean 25, stdDev 5), amount 37.5 -> Z = 2.5 (moderate)
      // Outlier 2 in Tech: baseline [100, 105, 100, 105] (mean 102.5, stdDev 2.5), amount 500 -> Z = 159 (critical)
      const transactions = [
        { id: 'f1', title: 'Food 1', amount: 20, category: 'Food' },
        { id: 'f2', title: 'Food 2', amount: 30, category: 'Food' },
        { id: 'f3', title: 'Food 3', amount: 20, category: 'Food' },
        { id: 'f4', title: 'Food 4', amount: 30, category: 'Food' },
        { id: 'f5', title: 'Food 5', amount: 37.5, category: 'Food' },

        { id: 't1', title: 'Tech 1', amount: 100, category: 'Tech' },
        { id: 't2', title: 'Tech 2', amount: 105, category: 'Tech' },
        { id: 't3', title: 'Tech 3', amount: 100, category: 'Tech' },
        { id: 't4', title: 'Tech 4', amount: 105, category: 'Tech' },
        { id: 't5', title: 'Server Rack', amount: 500, category: 'Tech' }
      ];

      const summary = anomalyService.getAnomalySummary(transactions);

      assert.strictEqual(summary.examinedCount, 10);
      assert.strictEqual(summary.totalTransactions, 10);
      assert.strictEqual(summary.anomalyCount, 2);
      assert.strictEqual(summary.anomalyRate, 20);

      // Category breakdown
      assert.strictEqual(summary.byCategory['Food'], 1);
      assert.strictEqual(summary.byCategory['Tech'], 1);

      // Severity breakdown
      assert.strictEqual(summary.bySeverity.moderate, 1);
      assert.strictEqual(summary.bySeverity.critical, 1);

      // Detailed category stats
      assert.ok(summary.categoryBreakdown['Food']);
      assert.strictEqual(summary.categoryBreakdown['Food'].count, 1);
      assert.strictEqual(summary.categoryBreakdown['Food'].totalAnomalousAmount, 37.5);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONTROLLER & ROUTES INTEGRATION UNIT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('AnomalyController & Routes - Express Handlers', () => {
  // In-memory mock Transaction model strictly implementing documented interface
  let mockDatabase = [];

  const mockTransactionModel = {
    schema: {
      paths: {
        userId: true,
        title: true,
        amount: true,
        category: true,
        date: true,
        recurring: true
      }
    },
    find: function (query) {
      return {
        lean: function () { return this; },
        sort: function () { return this; },
        exec: async function () {
          return mockDatabase.filter(doc => {
            // Check user isolation
            const matchesUser =
              (query.userId && doc.userId === query.userId) ||
              (query.user && doc.user === query.user) ||
              (query.$or && query.$or.some(c => (c.userId && doc.userId === c.userId) || (c.user && doc.user === c.user)));

            if (!matchesUser) return false;

            // Check date range
            if (query.date) {
              const docDate = new Date(doc.date).getTime();
              if (query.date.$gte && docDate < new Date(query.date.$gte).getTime()) return false;
              if (query.date.$lte && docDate > new Date(query.date.$lte).getTime()) return false;
            }

            // Check category filter
            if (query.category && doc.category !== query.category) return false;

            return true;
          });
        }
      };
    }
  };

  // Helper to create mock Express req & res
  function createMockReqRes({ user, query = {}, params = {}, headers = {} } = {}) {
    const req = {
      user,
      query,
      params,
      headers
    };

    const res = {
      statusCode: 200,
      jsonPayload: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        this.jsonPayload = payload;
        return this;
      }
    };

    return { req, res };
  }

  beforeEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_canonical_jwt_secret_key_123';
    anomalyController.setTransactionModel(mockTransactionModel);

    // Populate mock DB with test dataset across two users
    mockDatabase = [
      // User 1 transactions in 'Food' (1 outlier: ₹100 vs baseline [20, 25, 20, 25])
      { _id: 'u1_f1', userId: 'user_123', title: 'Tea 1', amount: 20, category: 'Food', date: new Date('2026-10-01'), recurring: false },
      { _id: 'u1_f2', userId: 'user_123', title: 'Tea 2', amount: 25, category: 'Food', date: new Date('2026-10-05'), recurring: false },
      { _id: 'u1_f3', userId: 'user_123', title: 'Tea 3', amount: 20, category: 'Food', date: new Date('2026-10-10'), recurring: false },
      { _id: 'u1_f4', userId: 'user_123', title: 'Tea 4', amount: 25, category: 'Food', date: new Date('2026-10-15'), recurring: false },
      { _id: 'u1_f5', userId: 'user_123', title: 'Banquet', amount: 100, category: 'Food', date: new Date('2026-10-20'), recurring: false },

      // User 1 transactions in 'Rent' (identical amounts, stdDev=0)
      { _id: 'u1_r1', userId: 'user_123', title: 'Rent Sep', amount: 5000, category: 'Rent', date: new Date('2026-09-01'), recurring: true },
      { _id: 'u1_r2', userId: 'user_123', title: 'Rent Oct', amount: 5000, category: 'Rent', date: new Date('2026-10-01'), recurring: true },
      { _id: 'u1_r3', userId: 'user_123', title: 'Rent Nov', amount: 5000, category: 'Rent', date: new Date('2026-11-01'), recurring: true },
      { _id: 'u1_r4', userId: 'user_123', title: 'Rent Dec', amount: 5000, category: 'Rent', date: new Date('2026-12-01'), recurring: true },

      // User 2 transactions (strict isolation boundary)
      { _id: 'u2_1', userId: 'user_456', title: 'Secret Spend', amount: 99999, category: 'Classified', date: new Date('2026-10-12'), recurring: false }
    ];
  });

  describe('1. Authentication & User Isolation', () => {
    test('returns 401 when req.user or req.user.id is missing', async () => {
      const { req, res } = createMockReqRes({ user: null });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('Authentication required'));
    });

    test('returns 401 when req.user has no id property', async () => {
      const { req, res } = createMockReqRes({ user: {} });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('Authentication required'));
    });

    test('rejects fallback authentication attempt without req.user.id even if req.userId is set', async () => {
      const { req, res } = createMockReqRes({ user: null });
      req.userId = 'insecure_fallback_id';
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('Authentication required'));
    });

    test('strictly isolates user data - never accesses other users transactions', async () => {
      const { req, res } = createMockReqRes({ user: { id: 'user_123' } });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonPayload.success, true);
      const data = res.jsonPayload.data;

      // Only user_123 examined count (9 items), user_456 transaction (99999) never read
      assert.strictEqual(data.examinedCount, 9);
      for (const item of data.anomalies) {
        assert.notStrictEqual(item.id, 'u2_1');
        assert.notStrictEqual(item.category, 'Classified');
      }
    });

    test('user_456 only sees their own transactions and anomalies', async () => {
      const { req, res } = createMockReqRes({ user: { id: 'user_456' } });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      // Single transaction for user_456 -> insufficient sample (< 3 baseline items) -> 0 anomalies
      assert.strictEqual(res.jsonPayload.data.examinedCount, 1);
      assert.strictEqual(res.jsonPayload.data.count, 0);
    });
  });

  describe('2. Date Range Filtering & Validation', () => {
    test('rejects invalid "from" date string with 400', async () => {
      const { req, res } = createMockReqRes({
        user: { id: 'user_123' },
        query: { from: 'invalid-date-string' }
      });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('Invalid date format'));
    });

    test('rejects invalid "to" date string with 400', async () => {
      const { req, res } = createMockReqRes({
        user: { id: 'user_123' },
        query: { to: 'invalid-to-date' }
      });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('Invalid date format'));
    });

    test('rejects when "from" date is chronologically after "to" date with 400', async () => {
      const { req, res } = createMockReqRes({
        user: { id: 'user_123' },
        query: { from: '2026-10-25', to: '2026-10-01' }
      });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('"from" date cannot be after "to" date'));
    });

    test('filters transactions accurately within valid date range', async () => {
      // Date range October 2026: includes 5 Food transactions + 1 Rent transaction (2026-10-01)
      const { req, res } = createMockReqRes({
        user: { id: 'user_123' },
        query: { from: '2026-10-01', to: '2026-10-31' }
      });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonPayload.data.examinedCount, 6);
    });
  });

  describe('3. GET /api/anomalies (Flagged-Only vs All)', () => {
    test('returns flagged-only rows by default with all required fields', async () => {
      const { req, res } = createMockReqRes({ user: { id: 'user_123' } });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      const data = res.jsonPayload.data;

      assert.strictEqual(data.flaggedOnly, true);
      assert.strictEqual(data.count, 1);
      assert.strictEqual(data.anomalies.length, 1);

      const anomaly = data.anomalies[0];
      // Verify all required fields from API contract & prompt specification:
      // id, title, amount, category, date, recurring, isAnomaly, zScore, anomalyReason
      assert.strictEqual(anomaly.id, 'u1_f5');
      assert.strictEqual(anomaly.title, 'Banquet');
      assert.strictEqual(anomaly.amount, 100);
      assert.strictEqual(anomaly.category, 'Food');
      assert.ok(anomaly.date);
      assert.strictEqual(typeof anomaly.recurring, 'boolean');
      assert.strictEqual(anomaly.isAnomaly, true);
      assert.strictEqual(anomaly.zScore, 31.0);
      assert.ok(anomaly.anomalyReason.includes('Unusually higher'));
    });

    test('returns all examined transactions when flaggedOnly=false', async () => {
      const { req, res } = createMockReqRes({
        user: { id: 'user_123' },
        query: { flaggedOnly: 'false' }
      });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      const data = res.jsonPayload.data;

      assert.strictEqual(data.flaggedOnly, false);
      assert.strictEqual(data.anomalies.length, 9);
      // Exactly 1 flagged among the 9
      assert.strictEqual(data.anomalies.filter(t => t.isAnomaly).length, 1);
    });
  });

  describe('4. GET /api/anomalies/summary', () => {
    test('calculates correct summary stats and distributions', async () => {
      const { req, res } = createMockReqRes({ user: { id: 'user_123' } });
      await anomalyController.getAnomalySummary(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonPayload.success, true);
      const data = res.jsonPayload.data;

      assert.strictEqual(data.examinedCount, 9);
      assert.strictEqual(data.totalTransactions, 9);
      assert.strictEqual(data.anomalyCount, 1);
      assert.strictEqual(data.byCategory['Food'], 1);
      assert.strictEqual(data.bySeverity.critical, 1);
      assert.strictEqual(data.categoryBreakdown['Food'].count, 1);
      assert.strictEqual(data.categoryBreakdown['Food'].totalAnomalousAmount, 100);
    });
  });

  describe('5. Read-Time Dynamic Calculation (No Permanent DB Writes)', () => {
    test('does not invoke save, update, or write operations on MongoDB model', async () => {
      let writeCalled = false;
      const readOnlyModel = {
        schema: { paths: { user: true } },
        find: function () {
          return {
            lean: () => this,
            sort: () => this,
            exec: async () => [
              { _id: '1', user: 'user_ro', title: 'T1', amount: 10, category: 'Test', date: new Date() },
              { _id: '2', user: 'user_ro', title: 'T2', amount: 10, category: 'Test', date: new Date() },
              { _id: '3', user: 'user_ro', title: 'T3', amount: 100, category: 'Test', date: new Date() }
            ]
          };
        },
        save: () => { writeCalled = true; },
        updateOne: () => { writeCalled = true; },
        updateMany: () => { writeCalled = true; },
        findOneAndUpdate: () => { writeCalled = true; }
      };

      anomalyController.setTransactionModel(readOnlyModel);

      const { req, res } = createMockReqRes({ user: { id: 'user_ro' } });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(writeCalled, false, 'MongoDB documents must never be saved permanently during anomaly reads');
    });
  });

  describe('6. Router & Canonical Protect Middleware Integration', () => {
    test('anomalyRoutes exports and mounts endpoints with canonical protect middleware', () => {
      const canonicalProtect = authMiddleware.protect || authMiddleware;
      assert.strictEqual(anomalyRoutes.protect, canonicalProtect);

      // Verify every registered route in anomalyRoutes has canonical protect attached
      const routeLayers = anomalyRoutes.stack.filter(l => l.route);
      assert.ok(routeLayers.length >= 2, 'Routes must be registered in router stack');
      for (const layer of routeLayers) {
        const routeHandlers = layer.route.stack.map(s => s.handle);
        assert.ok(
          routeHandlers.includes(canonicalProtect),
          `Route ${layer.route.path} must be protected by canonical authMiddleware.protect`
        );
      }
    });

    test('protect middleware blocks requests lacking authorization header with 401', async () => {
      const { req, res } = createMockReqRes({ headers: {} });
      let nextCalled = false;

      await anomalyRoutes.protect(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('Authentication required'));
    });

    test('protect middleware never bypasses JWT verification based on req.user alone', async () => {
      // Incoming request has req.user pre-set, but NO Authorization header
      const { req, res } = createMockReqRes({ user: { id: 'unverified_spoofed_user' }, headers: {} });
      let nextCalled = false;

      await anomalyRoutes.protect(req, res, () => {
        nextCalled = true;
      });

      // Must be rejected with 401, never calling next()
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('token missing or invalid'));
    });

    test('protect middleware rejects invalid or malformed tokens with 401', async () => {
      const { req, res } = createMockReqRes({
        headers: { authorization: 'Bearer invalid.jwt.payload' }
      });
      let nextCalled = false;

      await anomalyRoutes.protect(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('token is invalid'));
    });

    test('protect middleware passes authenticated requests with valid signed JWT and active user', async () => {
      const testSecret = process.env.JWT_SECRET || 'test_canonical_jwt_secret_key_123';
      process.env.JWT_SECRET = testSecret;

      const token = jwt.sign({ id: 'active_valid_user_id' }, testSecret);
      const { req, res } = createMockReqRes({
        headers: { authorization: `Bearer ${token}` }
      });

      // Stub User.findById to verify canonical protect's database verification step without live connection
      const origFindById = User.findById;
      User.findById = async (id) => ({
        _id: id,
        name: 'Authenticated Test User',
        email: 'auth_test@example.com'
      });

      let nextCalled = false;
      try {
        await anomalyRoutes.protect(req, res, () => {
          nextCalled = true;
        });

        assert.strictEqual(nextCalled, true);
        assert.ok(req.user);
        assert.strictEqual(req.user.id, 'active_valid_user_id');
        assert.strictEqual(req.user.name, 'Authenticated Test User');
      } finally {
        User.findById = origFindById;
      }
    });
  });
});
