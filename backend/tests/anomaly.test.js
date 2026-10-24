/**
 * KharchaSense Backend Anomaly Detection Test Suite
 * 
 * Uses Node.js native test runner (node:test) and assertions (node:assert/strict).
 * Tests all requirements deterministically:
 * - Pure numerical service: empty datasets, insufficient samples (<2), zero std dev, normal data, extreme amounts, category isolation
 * - Controller & routes: user isolation, date range validation, flagged-only output, read-time calculation
 */

'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const anomalyService = require('../services/anomalyService');
const anomalyController = require('../controllers/anomalyController');
const anomalyRoutes = require('../routes/anomalyRoutes');

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

  describe('2. Insufficient Samples (< 2 valid items per category)', () => {
    test('single transaction in category is never flagged as an anomaly', () => {
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

    test('single valid item with invalid non-numeric items is not flagged', () => {
      const transactions = [
        { id: '1', title: 'Valid', amount: 9999, category: 'Tech' },
        { id: '2', title: 'Corrupt', amount: 'not-a-number', category: 'Tech' },
        { id: '3', title: 'Null amount', amount: null, category: 'Tech' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 3);
      assert.strictEqual(analyzed[0].isAnomaly, false);
      assert.strictEqual(analyzed[1].isAnomaly, false);
      assert.strictEqual(analyzed[2].isAnomaly, false);
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
    });
  });

  describe('3. Zero Standard Deviation (Identical Amounts)', () => {
    test('identical amounts produce stdDev=0 and are never falsely flagged', () => {
      const transactions = [
        { id: '1', title: 'Netflix', amount: 199, category: 'Entertainment', recurring: true },
        { id: '2', title: 'Spotify', amount: 199, category: 'Entertainment', recurring: true },
        { id: '3', title: 'YouTube', amount: 199, category: 'Entertainment', recurring: true }
      ];

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
  });

  describe('4. Normal Data (No Anomalies Flagged)', () => {
    test('transactions within 2 standard deviations are all normal', () => {
      // Mean: 50, values: 48, 50, 52, 49, 51
      const transactions = [
        { id: '1', title: 'Milk', amount: 48, category: 'Groceries' },
        { id: '2', title: 'Eggs', amount: 50, category: 'Groceries' },
        { id: '3', title: 'Bread', amount: 52, category: 'Groceries' },
        { id: '4', title: 'Butter', amount: 49, category: 'Groceries' },
        { id: '5', title: 'Cheese', amount: 51, category: 'Groceries' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 5);
      for (const tx of analyzed) {
        assert.strictEqual(tx.isAnomaly, false);
        assert.ok(Math.abs(tx.zScore) < 2);
        assert.strictEqual(tx.anomalyReason, null);
      }
      assert.strictEqual(anomalyService.countAnomalies(transactions), 0);
      assert.deepStrictEqual(anomalyService.getAnomalies(transactions), []);
    });
  });

  describe('5. Extreme Amounts (Outliers Detected)', () => {
    test('flags high extreme amount with |Z| >= 2.0 and directional explanation', () => {
      // Population of 5: [20, 20, 20, 20, 200]
      // Mean = 56, variance = (4*1296 + 20736)/5 = 25920/5 = 5184.
      // stdDev = sqrt(5184) = 72.
      // Z for 200 = (200 - 56) / 72 = +2.0
      const transactions = [
        { id: '1', title: 'Tea', amount: 20, category: 'Food' },
        { id: '2', title: 'Tea', amount: 20, category: 'Food' },
        { id: '3', title: 'Tea', amount: 20, category: 'Food' },
        { id: '4', title: 'Tea', amount: 20, category: 'Food' },
        { id: '5', title: 'Fancy Dinner', amount: 200, category: 'Food' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 5);

      const outlier = analyzed.find(t => t.id === '5');
      assert.ok(outlier);
      assert.strictEqual(outlier.isAnomaly, true);
      assert.strictEqual(outlier.zScore, 2.0);
      assert.ok(outlier.anomalyReason.includes('Unusually higher'));
      assert.ok(outlier.anomalyReason.includes('"Food"'));
      assert.ok(outlier.anomalyReason.includes('₹200.00'));

      // Check remaining 4 are not anomalies
      const normals = analyzed.filter(t => t.id !== '5');
      for (const n of normals) {
        assert.strictEqual(n.isAnomaly, false);
        assert.strictEqual(n.zScore, -0.5);
      }

      assert.strictEqual(anomalyService.countAnomalies(transactions), 1);
      const flaggedOnly = anomalyService.getAnomalies(transactions);
      assert.strictEqual(flaggedOnly.length, 1);
      assert.strictEqual(flaggedOnly[0].id, '5');
    });

    test('flags low extreme amount with negative Z-Score (Z <= -2.0)', () => {
      // Population of 5: [200, 200, 200, 200, 20]
      // Mean = 164, stdDev = 72
      // Z for 20 = (20 - 164) / 72 = -2.0
      const transactions = [
        { id: '1', title: 'Fine Dining 1', amount: 200, category: 'Food' },
        { id: '2', title: 'Fine Dining 2', amount: 200, category: 'Food' },
        { id: '3', title: 'Fine Dining 3', amount: 200, category: 'Food' },
        { id: '4', title: 'Fine Dining 4', amount: 200, category: 'Food' },
        { id: '5', title: 'Vending Snack', amount: 20, category: 'Food' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      const outlier = analyzed.find(t => t.id === '5');
      assert.ok(outlier);
      assert.strictEqual(outlier.isAnomaly, true);
      assert.strictEqual(outlier.zScore, -2.0);
      assert.ok(outlier.anomalyReason.includes('Unusually lower'));
    });

    test('custom threshold parameter is respected', () => {
      // Mean = 56, stdDev = 72. Z for 200 is 2.0.
      const transactions = [
        { id: '1', amount: 20, category: 'Food' },
        { id: '2', amount: 20, category: 'Food' },
        { id: '3', amount: 20, category: 'Food' },
        { id: '4', amount: 20, category: 'Food' },
        { id: '5', amount: 200, category: 'Food' }
      ];

      // With threshold 2.5, Z=2.0 is NOT flagged
      const highThresh = anomalyService.detectAnomalies(transactions, 2.5);
      assert.strictEqual(highThresh.find(t => t.id === '5').isAnomaly, false);

      // With threshold 1.5, Z=2.0 IS flagged
      const lowThresh = anomalyService.detectAnomalies(transactions, 1.5);
      assert.strictEqual(lowThresh.find(t => t.id === '5').isAnomaly, true);
    });
  });

  describe('6. Category Isolation', () => {
    test('statistical evaluations are completely isolated per category', () => {
      // In 'Coffee', 30 is normal.
      // In 'Rent', 15000 is normal.
      // In 'Office Supplies', [10, 10, 10, 10, 100] -> 100 is anomaly.
      // Even though 15000 is huge compared to 100, Rent does not affect Office Supplies.
      const transactions = [
        { id: 'c1', title: 'Espresso', amount: 5, category: 'Coffee' },
        { id: 'c2', title: 'Latte', amount: 5, category: 'Coffee' },
        { id: 'c3', title: 'Mocha', amount: 5, category: 'Coffee' },

        { id: 'r1', title: 'Office Rent Oct', amount: 15000, category: 'Rent' },
        { id: 'r2', title: 'Office Rent Nov', amount: 15000, category: 'Rent' },

        { id: 's1', title: 'Pen', amount: 10, category: 'Supplies' },
        { id: 's2', title: 'Paper', amount: 10, category: 'Supplies' },
        { id: 's3', title: 'Staples', amount: 10, category: 'Supplies' },
        { id: 's4', title: 'Clips', amount: 10, category: 'Supplies' },
        { id: 's5', title: 'Bulk Toner', amount: 100, category: 'Supplies' }
      ];

      const analyzed = anomalyService.detectAnomalies(transactions);
      assert.strictEqual(analyzed.length, 10);

      // Only s5 in 'Supplies' should be flagged
      const anomalies = analyzed.filter(t => t.isAnomaly);
      assert.strictEqual(anomalies.length, 1);
      assert.strictEqual(anomalies[0].id, 's5');
      assert.strictEqual(anomalies[0].category, 'Supplies');

      // Rent should have stdDev=0 and no anomalies
      const rentTx = analyzed.filter(t => t.category === 'Rent');
      assert.strictEqual(rentTx.length, 2);
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
      // Outlier 1 in Food: Z = 2.0 (moderate)
      // Outlier 2 in Tech: Z >= 3.0 (critical)
      const transactions = [
        // Food: [20, 20, 20, 20, 200] -> Z=2.0 (moderate)
        { id: 'f1', title: 'Food 1', amount: 20, category: 'Food' },
        { id: 'f2', title: 'Food 2', amount: 20, category: 'Food' },
        { id: 'f3', title: 'Food 3', amount: 20, category: 'Food' },
        { id: 'f4', title: 'Food 4', amount: 20, category: 'Food' },
        { id: 'f5', title: 'Food 5', amount: 200, category: 'Food' },

        // Tech: [100, 100, 100, 100, 100, 100, 100, 100, 100, 10000] -> Critical outlier
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `t${i}`,
          title: `Cable ${i}`,
          amount: 100,
          category: 'Tech'
        })),
        { id: 't9', title: 'Server Rack', amount: 10000, category: 'Tech' }
      ];

      const summary = anomalyService.getAnomalySummary(transactions);

      assert.strictEqual(summary.examinedCount, 15);
      assert.strictEqual(summary.totalTransactions, 15);
      assert.strictEqual(summary.anomalyCount, 2);
      assert.strictEqual(summary.anomalyRate, Number(((2 / 15) * 100).toFixed(2)));

      // Category breakdown
      assert.strictEqual(summary.byCategory['Food'], 1);
      assert.strictEqual(summary.byCategory['Tech'], 1);

      // Severity breakdown
      assert.strictEqual(summary.bySeverity.moderate, 1);
      assert.strictEqual(summary.bySeverity.critical, 1);

      // Detailed category stats
      assert.ok(summary.categoryBreakdown['Food']);
      assert.strictEqual(summary.categoryBreakdown['Food'].count, 1);
      assert.strictEqual(summary.categoryBreakdown['Food'].totalAnomalousAmount, 200);
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
      const self = this;
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
  function createMockReqRes({ user, query = {}, params = {} } = {}) {
    const req = {
      user,
      query,
      params,
      headers: {}
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
    anomalyController.setTransactionModel(mockTransactionModel);

    // Populate mock DB with test dataset across two users
    mockDatabase = [
      // User 1 transactions in 'Food' (1 outlier: ₹200 vs ₹20)
      { _id: 'u1_f1', userId: 'user_123', title: 'Tea 1', amount: 20, category: 'Food', date: new Date('2026-10-01'), recurring: false },
      { _id: 'u1_f2', userId: 'user_123', title: 'Tea 2', amount: 20, category: 'Food', date: new Date('2026-10-05'), recurring: false },
      { _id: 'u1_f3', userId: 'user_123', title: 'Tea 3', amount: 20, category: 'Food', date: new Date('2026-10-10'), recurring: false },
      { _id: 'u1_f4', userId: 'user_123', title: 'Tea 4', amount: 20, category: 'Food', date: new Date('2026-10-15'), recurring: false },
      { _id: 'u1_f5', userId: 'user_123', title: 'Banquet', amount: 200, category: 'Food', date: new Date('2026-10-20'), recurring: false },

      // User 1 transactions in 'Rent' (identical amounts, stdDev=0)
      { _id: 'u1_r1', userId: 'user_123', title: 'Rent Sep', amount: 5000, category: 'Rent', date: new Date('2026-09-01'), recurring: true },
      { _id: 'u1_r2', userId: 'user_123', title: 'Rent Oct', amount: 5000, category: 'Rent', date: new Date('2026-10-01'), recurring: true },

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

    test('strictly isolates user data - never accesses other users transactions', async () => {
      const { req, res } = createMockReqRes({ user: { id: 'user_123' } });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonPayload.success, true);
      const data = res.jsonPayload.data;

      // Only user_123 examined count (7 items), user_456 transaction (99999) never read
      assert.strictEqual(data.examinedCount, 7);
      for (const item of data.anomalies) {
        assert.notStrictEqual(item.id, 'u2_1');
        assert.notStrictEqual(item.category, 'Classified');
      }
    });

    test('user_456 only sees their own transactions and anomalies', async () => {
      const { req, res } = createMockReqRes({ user: { id: 'user_456' } });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      // Single transaction for user_456 -> insufficient sample (<2) -> 0 anomalies
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
      // Date range October 2026 excludes the September Rent transaction
      const { req, res } = createMockReqRes({
        user: { id: 'user_123' },
        query: { from: '2026-10-01', to: '2026-10-31' }
      });
      await anomalyController.getAnomalies(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      // Total examined in Oct: 5 Food + 1 Rent = 6 transactions
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
      assert.strictEqual(anomaly.amount, 200);
      assert.strictEqual(anomaly.category, 'Food');
      assert.ok(anomaly.date);
      assert.strictEqual(typeof anomaly.recurring, 'boolean');
      assert.strictEqual(anomaly.isAnomaly, true);
      assert.strictEqual(anomaly.zScore, 2.0);
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
      assert.strictEqual(data.anomalies.length, 7);
      // Exactly 1 flagged among the 7
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

      assert.strictEqual(data.examinedCount, 7);
      assert.strictEqual(data.totalTransactions, 7);
      assert.strictEqual(data.anomalyCount, 1);
      assert.strictEqual(data.byCategory['Food'], 1);
      assert.strictEqual(data.bySeverity.moderate, 1);
      assert.strictEqual(data.bySeverity.critical, 0);
      assert.strictEqual(data.categoryBreakdown['Food'].count, 1);
      assert.strictEqual(data.categoryBreakdown['Food'].totalAnomalousAmount, 200);
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

  describe('6. Router & Protect Middleware Integration', () => {
    test('protect middleware blocks requests lacking user authentication', () => {
      const { req, res } = createMockReqRes({ user: null });
      let nextCalled = false;

      anomalyRoutes.protect(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonPayload.success, false);
      assert.ok(res.jsonPayload.message.includes('Authentication required'));
    });

    test('protect middleware passes authenticated requests with req.user.id', () => {
      const { req, res } = createMockReqRes({ user: { id: 'valid_user_id' } });
      let nextCalled = false;

      anomalyRoutes.protect(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });
  });
});
