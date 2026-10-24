/**
 * KharchaSense Phase 2 - Analytics Unit Tests
 * Tests calculation semantics, UTC date range filtering, empty state safety,
 * deterministic aggregations, controller validation, and route bindings.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const analyticsService = require('../services/analyticsService');
const analyticsController = require('../controllers/analyticsController');
const analyticsRoutes = require('../routes/analyticsRoutes');

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const TEST_USER_ID = '671ad4ef8c983a54b3d11a21';

const DETERMINISTIC_TRANSACTIONS = [
  {
    user: TEST_USER_ID,
    title: 'Groceries Supermarket',
    amount: 120.50,
    category: 'Food',
    date: '2026-10-05T10:00:00.000Z',
    recurring: false
  },
  {
    user: TEST_USER_ID,
    title: 'Broadband Fiber',
    amount: 60.00,
    category: 'Utilities',
    date: '2026-10-01T08:00:00.000Z',
    recurring: true
  },
  {
    user: TEST_USER_ID,
    title: 'Streaming Subscription',
    amount: 15.00,
    category: 'Entertainment',
    date: '2026-10-15T12:00:00.000Z',
    recurring: true
  },
  {
    user: TEST_USER_ID,
    title: 'Italian Restaurant',
    amount: 45.00,
    category: 'Food',
    date: '2026-10-20T19:30:00.000Z',
    recurring: false
  },
  {
    user: TEST_USER_ID,
    title: 'Power Bill',
    amount: 80.00,
    category: 'Utilities',
    date: '2026-10-10T14:00:00.000Z',
    recurring: false
  },
  {
    user: TEST_USER_ID,
    title: 'Gym Membership',
    amount: 50.00,
    category: 'Health',
    date: '2026-10-01T06:00:00.000Z',
    recurring: true
  },
  {
    user: TEST_USER_ID,
    title: 'Office Stationery',
    amount: '25.50',
    category: '  Office Supplies  ',
    date: '2026-10-22',
    recurring: false
  },
  {
    user: TEST_USER_ID,
    title: 'Unknown Misc Expense',
    amount: 10.00,
    category: '',
    date: '2026-10-25T11:00:00.000Z',
    recurring: false
  }
];

// ─── 1. Amount Extraction & Sanitization Tests ─────────────────────────────────

describe('Phase 1 Amount Extraction & Data Parsing', () => {
  it('correctly parses plain numeric amounts', () => {
    assert.strictEqual(analyticsService.extractValidAmount({ amount: 50 }), 50);
    assert.strictEqual(analyticsService.extractValidAmount({ amount: 12.34 }), 12.34);
    assert.strictEqual(analyticsService.extractValidAmount({ amount: 0 }), 0);
  });

  it('sanitizes strings with currency symbols and formatting', () => {
    assert.strictEqual(analyticsService.extractValidAmount({ amount: '$120.50' }), 120.50);
    assert.strictEqual(analyticsService.extractValidAmount({ amount: '₹1,500.25' }), 1500.25);
    assert.strictEqual(analyticsService.extractValidAmount({ amount: '  45.00 ' }), 45.00);
  });

  it('safely handles invalid, negative, or corrupt amounts by returning 0', () => {
    assert.strictEqual(analyticsService.extractValidAmount({ amount: -50 }), 0);
    assert.strictEqual(analyticsService.extractValidAmount({ amount: 'invalid-number' }), 0);
    assert.strictEqual(analyticsService.extractValidAmount({ amount: null }), 0);
    assert.strictEqual(analyticsService.extractValidAmount({ amount: undefined }), 0);
    assert.strictEqual(analyticsService.extractValidAmount(null), 0);
    assert.strictEqual(analyticsService.extractValidAmount(undefined), 0);
    assert.strictEqual(analyticsService.extractValidAmount({}), 0);
  });

  it('normalizes category strings and trims whitespace', () => {
    assert.strictEqual(analyticsService.extractCategory({ category: ' Food ' }), 'Food');
    assert.strictEqual(analyticsService.extractCategory({ category: '' }), 'Uncategorized');
    assert.strictEqual(analyticsService.extractCategory({ category: '   ' }), 'Uncategorized');
    assert.strictEqual(analyticsService.extractCategory({ category: null }), 'Uncategorized');
    assert.strictEqual(analyticsService.extractCategory({}), 'Uncategorized');
  });

  it('extracts date keys in UTC format YYYY-MM-DD', () => {
    assert.strictEqual(
      analyticsService.extractDateKey({ date: '2026-10-24T18:00:00.000Z' }),
      '2026-10-24'
    );
    assert.strictEqual(
      analyticsService.extractDateKey({ date: '2026-10-01' }),
      '2026-10-01'
    );
    const d = new Date('2026-10-15T00:00:00.000Z');
    assert.strictEqual(analyticsService.extractDateKey({ date: d }), '2026-10-15');
    assert.strictEqual(analyticsService.extractDateKey({ date: null }), 'Unknown');
  });
});

// ─── 2. Safe Zero & Empty State Handling Tests ─────────────────────────────────

describe('Safe Zero & Empty State Handling (No NaN)', () => {
  it('returns safe zero values for summary metrics when transactions array is empty', () => {
    const summary = analyticsService.generateSummaryMetrics([]);
    assert.strictEqual(summary.totalSpending, 0);
    assert.strictEqual(summary.totalExpenses, 0);
    assert.strictEqual(summary.transactionCount, 0);
    assert.strictEqual(summary.highestSpendingCategory, null);
    assert.strictEqual(summary.topCategory, null);
    assert.strictEqual(summary.recurringCount, 0);
    assert.strictEqual(summary.recurringSpend, 0);
    assert.strictEqual(summary.averageTransactionSize, 0);
    assert.strictEqual(Number.isNaN(summary.averageTransactionSize), false);
  });

  it('returns safe zero values for summary metrics when input is null/undefined', () => {
    const summaryNull = analyticsService.generateSummaryMetrics(null);
    assert.strictEqual(summaryNull.totalSpending, 0);
    assert.strictEqual(summaryNull.averageTransactionSize, 0);
    assert.strictEqual(Number.isNaN(summaryNull.averageTransactionSize), false);

    const summaryUndef = analyticsService.generateSummaryMetrics(undefined);
    assert.strictEqual(summaryUndef.totalSpending, 0);
    assert.strictEqual(summaryUndef.averageTransactionSize, 0);
  });

  it('returns safe empty structures for category metrics when empty', () => {
    const categories = analyticsService.calculateCategoryMetrics([]);
    assert.deepStrictEqual(categories.categories, []);
    assert.deepStrictEqual(categories.totals, {});
    assert.deepStrictEqual(categories.counts, {});
    assert.deepStrictEqual(categories.percentages, {});
    assert.strictEqual(categories.totalSpending, 0);
  });

  it('returns safe empty structures for trends when empty', () => {
    const trends = analyticsService.calculateTrends([]);
    assert.deepStrictEqual(trends.trends, []);
    assert.deepStrictEqual(trends.dailyTotals, {});
    assert.deepStrictEqual(trends.labels, []);
    assert.deepStrictEqual(trends.data, []);
    assert.strictEqual(trends.totalSpending, 0);
  });

  it('returns safe zero structures for recurring summaries when empty', () => {
    const recurring = analyticsService.calculateRecurringTotals([]);
    assert.strictEqual(recurring.recurring.amount, 0);
    assert.strictEqual(recurring.recurring.count, 0);
    assert.strictEqual(recurring.recurring.percentage, 0);
    assert.strictEqual(recurring.nonRecurring.amount, 0);
    assert.strictEqual(recurring.nonRecurring.count, 0);
    assert.strictEqual(recurring.nonRecurring.percentage, 0);
    assert.strictEqual(recurring.totalSpending, 0);
    assert.strictEqual(recurring.totalCount, 0);
  });
});

// ─── 3. Deterministic Transaction Fixtures & Calculations ──────────────────────

describe('Deterministic Calculations & Totals Verification', () => {
  it('calculates exact total spending and transaction count', () => {
    const total = analyticsService.calculateTotalExpenses(DETERMINISTIC_TRANSACTIONS);
    const count = analyticsService.calculateTotalTransactions(DETERMINISTIC_TRANSACTIONS);

    // 120.50 + 60.00 + 15.00 + 45.00 + 80.00 + 50.00 + 25.50 + 10.00 = 406.00
    assert.strictEqual(total, 406.00);
    assert.strictEqual(count, 8);
  });

  it('calculates average transaction size without precision errors', () => {
    const summary = analyticsService.generateSummaryMetrics(DETERMINISTIC_TRANSACTIONS);
    // 406.00 / 8 = 50.75
    assert.strictEqual(summary.averageTransactionSize, 50.75);
    assert.strictEqual(summary.transactionCount, 8);
    assert.strictEqual(summary.totalSpending, 406.00);
  });

  it('identifies highest-spending category correctly', () => {
    const topCat = analyticsService.getHighestSpendingCategory(DETERMINISTIC_TRANSACTIONS);
    // Food: 120.50 + 45.00 = 165.50
    // Utilities: 60.00 + 80.00 = 140.00
    assert.notStrictEqual(topCat, null);
    assert.strictEqual(topCat.category, 'Food');
    assert.strictEqual(topCat.amount, 165.50);
  });

  it('calculates recurring vs non-recurring amount, count, and percentages', () => {
    const result = analyticsService.calculateRecurringTotals(DETERMINISTIC_TRANSACTIONS);

    // Recurring: Broadband (60) + Streaming (15) + Gym (50) = 125.00, count: 3
    assert.strictEqual(result.recurring.amount, 125.00);
    assert.strictEqual(result.recurring.count, 3);
    // 125.00 / 406.00 * 100 = 30.79%
    assert.strictEqual(result.recurring.percentage, 30.79);

    // Non-recurring: Groceries (120.50) + Dinner (45) + Power (80) + Office (25.50) + Misc (10) = 281.00, count: 5
    assert.strictEqual(result.nonRecurring.amount, 281.00);
    assert.strictEqual(result.nonRecurring.count, 5);
    // 281.00 / 406.00 * 100 = 69.21%
    assert.strictEqual(result.nonRecurring.percentage, 69.21);

    // Sum of amounts and percentages
    assert.strictEqual(
      Number((result.recurring.amount + result.nonRecurring.amount).toFixed(2)),
      406.00
    );
    assert.strictEqual(
      Number((result.recurring.percentage + result.nonRecurring.percentage).toFixed(2)),
      100.00
    );
  });
});

// ─── 4. Category Aggregations & Percentage Distribution ────────────────────────

describe('Category Analytics & Percentage Distribution', () => {
  it('groups spending by category and sorts categories descending by total spend', () => {
    const catData = analyticsService.calculateCategoryMetrics(DETERMINISTIC_TRANSACTIONS);

    assert.strictEqual(catData.categories.length, 6);
    // Top category should be first
    assert.strictEqual(catData.categories[0].category, 'Food');
    assert.strictEqual(catData.categories[0].total, 165.50);
    assert.strictEqual(catData.categories[0].count, 2);
    assert.strictEqual(catData.categories[0].percentage, 40.76);

    // Second category: Utilities
    assert.strictEqual(catData.categories[1].category, 'Utilities');
    assert.strictEqual(catData.categories[1].total, 140.00);
    assert.strictEqual(catData.categories[1].count, 2);
    assert.strictEqual(catData.categories[1].percentage, 34.48);

    // Category with trimmed whitespace
    const officeCat = catData.categories.find(c => c.category === 'Office Supplies');
    assert.notStrictEqual(officeCat, undefined);
    assert.strictEqual(officeCat.total, 25.50);

    // Uncategorized category
    const uncat = catData.categories.find(c => c.category === 'Uncategorized');
    assert.notStrictEqual(uncat, undefined);
    assert.strictEqual(uncat.total, 10.00);

    // Totals map lookup
    assert.strictEqual(catData.totals['Food'], 165.50);
    assert.strictEqual(catData.totals['Utilities'], 140.00);
  });
});

// ─── 5. Chronological Trends Aggregation ───────────────────────────────────────

describe('Date-wise Chronological Spending Aggregation', () => {
  it('aggregates daily amounts and strictly sorts dates chronologically', () => {
    // Pass transactions in shuffled date order
    const shuffled = [...DETERMINISTIC_TRANSACTIONS].reverse();
    const trendData = analyticsService.calculateTrends(shuffled);

    const dates = trendData.trends.map(t => t.date);

    // Verify chronological order
    const expectedChronologicalDates = [
      '2026-10-01',
      '2026-10-05',
      '2026-10-10',
      '2026-10-15',
      '2026-10-20',
      '2026-10-22',
      '2026-10-25'
    ];
    assert.deepStrictEqual(dates, expectedChronologicalDates);

    // Verify multi-transaction aggregation on same date (2026-10-01 has Broadband 60 + Gym 50)
    const day1 = trendData.trends.find(t => t.date === '2026-10-01');
    assert.strictEqual(day1.total, 110.00);
    assert.strictEqual(day1.count, 2);

    assert.strictEqual(trendData.dailyTotals['2026-10-01'], 110.00);
    assert.strictEqual(trendData.dailyTotals['2026-10-05'], 120.50);
  });
});

// ─── 6. Date Range Filtering (UTC from / to) ───────────────────────────────────

describe('UTC Date Range Filtering (from / to)', () => {
  it('filters transactions using both from and to bounds in UTC', () => {
    // Window: 2026-10-10 to 2026-10-20
    // Expected: Power Bill (10th: 80), Streaming (15th: 15), Restaurant (20th: 45) -> Total: 140.00, Count: 3
    const filtered = analyticsService.filterTransactionsByDate(
      DETERMINISTIC_TRANSACTIONS,
      '2026-10-10',
      '2026-10-20'
    );
    assert.strictEqual(filtered.length, 3);
    assert.strictEqual(analyticsService.calculateTotalExpenses(filtered), 140.00);
  });

  it('filters transactions using only from bound', () => {
    // From 2026-10-22 onwards
    // Expected: Office Supplies (22nd: 25.50) + Misc (25th: 10.00) -> Total: 35.50, Count: 2
    const filtered = analyticsService.filterTransactionsByDate(
      DETERMINISTIC_TRANSACTIONS,
      '2026-10-22',
      undefined
    );
    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(analyticsService.calculateTotalExpenses(filtered), 35.50);
  });

  it('filters transactions using only to bound', () => {
    // Up to 2026-10-05
    // Expected: Broadband (1st: 60), Gym (1st: 50), Groceries (5th: 120.50) -> Total: 230.50, Count: 3
    const filtered = analyticsService.filterTransactionsByDate(
      DETERMINISTIC_TRANSACTIONS,
      undefined,
      '2026-10-05'
    );
    assert.strictEqual(filtered.length, 3);
    assert.strictEqual(analyticsService.calculateTotalExpenses(filtered), 230.50);
  });

  it('returns empty array if date range does not match any transactions', () => {
    const filtered = analyticsService.filterTransactionsByDate(
      DETERMINISTIC_TRANSACTIONS,
      '2025-01-01',
      '2025-01-31'
    );
    assert.strictEqual(filtered.length, 0);
  });
});

// ─── 7. Controller Request Validation Tests ────────────────────────────────────

describe('Analytics Controller Validation & Error Envelopes', () => {
  it('validates YYYY-MM-DD date formats and valid calendar dates', () => {
    assert.strictEqual(analyticsController.isValidDateString('2026-10-24'), true);
    assert.strictEqual(analyticsController.isValidDateString('2026-02-28'), true);

    // Invalid formats or dates
    assert.strictEqual(analyticsController.isValidDateString('2026-13-01'), false); // Month 13
    assert.strictEqual(analyticsController.isValidDateString('2026-02-30'), false); // Feb 30
    assert.strictEqual(analyticsController.isValidDateString('24-10-2026'), false);
    assert.strictEqual(analyticsController.isValidDateString('random-string'), false);
    assert.strictEqual(analyticsController.isValidDateString(''), false);
  });

  it('validates from/to range constraints', () => {
    const valid = analyticsController.validateDateRange('2026-10-01', '2026-10-31');
    assert.strictEqual(valid.isValid, true);

    const inverted = analyticsController.validateDateRange('2026-10-31', '2026-10-01');
    assert.strictEqual(inverted.isValid, false);
    assert.strictEqual(inverted.message, '"from" date cannot be after "to" date');

    const invalidFrom = analyticsController.validateDateRange('bad-date', '2026-10-31');
    assert.strictEqual(invalidFrom.isValid, false);
    assert.strictEqual(invalidFrom.message, 'Invalid "from" date. Format must be YYYY-MM-DD');

    const invalidTo = analyticsController.validateDateRange('2026-10-01', 'bad-date');
    assert.strictEqual(invalidTo.isValid, false);
    assert.strictEqual(invalidTo.message, 'Invalid "to" date. Format must be YYYY-MM-DD');
  });

  it('returns 401 Unauthorized envelope when req.user is missing', async () => {
    let responseStatus;
    let responseJson;

    const req = { query: {} };
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(payload) {
        responseJson = payload;
        return this;
      }
    };

    await analyticsController.getSummary(req, res);
    assert.strictEqual(responseStatus, 401);
    assert.strictEqual(responseJson.success, false);
    assert.strictEqual(responseJson.message.includes('authentication required'), true);
  });

  it('returns 400 Bad Request envelope when query date range is invalid', async () => {
    let responseStatus;
    let responseJson;

    const req = {
      user: { id: TEST_USER_ID },
      query: { from: '2026-10-31', to: '2026-10-01' }
    };
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(payload) {
        responseJson = payload;
        return this;
      }
    };

    await analyticsController.getSummary(req, res);
    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseJson.success, false);
    assert.strictEqual(responseJson.message, '"from" date cannot be after "to" date');
  });
});

// ─── 8. Routes & MVC Route Binding Tests ───────────────────────────────────────

describe('Analytics Routes Bindings & Security Contract', () => {
  it('exports an Express Router instance with all 4 required routes', () => {
    assert.strictEqual(typeof analyticsRoutes, 'function');
    assert.strictEqual(typeof analyticsRoutes.use, 'function');

    // Inspect registered route paths in the router stack
    const registeredRoutes = analyticsRoutes.stack
      .filter(layer => layer.route)
      .map(layer => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      }));

    const paths = registeredRoutes.map(r => r.path);
    assert.strictEqual(paths.includes('/summary'), true);
    assert.strictEqual(paths.includes('/categories'), true);
    assert.strictEqual(paths.includes('/trends'), true);
    assert.strictEqual(paths.includes('/recurring'), true);

    // Verify all routes are GET
    for (const route of registeredRoutes) {
      assert.deepStrictEqual(route.methods, ['get']);
    }
  });

  it('rejects unauthenticated requests at router middleware level', () => {
    let statusCalled;
    let jsonPayload;

    const req = { user: null, headers: {} };
    const res = {
      status(code) {
        statusCalled = code;
        return this;
      },
      json(payload) {
        jsonPayload = payload;
        return this;
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    // Execute the auth middleware on the router stack (first middleware layer)
    const authLayer = analyticsRoutes.stack.find(layer => !layer.route);
    assert.notStrictEqual(authLayer, undefined);

    authLayer.handle(req, res, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCalled, 401);
    assert.strictEqual(jsonPayload.success, false);
  });
});

// ─── 9. Service Integration & Model Contract Verification ──────────────────────

describe('Model Integration Contract & Diagnostic Handling', () => {
  it('throws 503 with helpful message when Transaction model is missing and no fixture is passed', async () => {
    await assert.rejects(
      async () => {
        await analyticsService.fetchTransactions({
          userId: TEST_USER_ID,
          Model: null
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 503);
        assert.strictEqual(err.message.includes('backend/models/Transaction.js'), true);
        return true;
      }
    );
  });

  it('supports dependency injection of Transaction Model adhering to schema contract', async () => {
    // Simulated Transaction model with lean().exec()
    const mockModel = {
      schema: { paths: { userId: true } },
      find(query) {
        return {
          lean() {
            return {
              exec: async () => DETERMINISTIC_TRANSACTIONS
            };
          }
        };
      }
    };

    const summary = await analyticsService.getSummary({
      userId: TEST_USER_ID,
      Model: mockModel
    });

    assert.strictEqual(summary.totalSpending, 406.00);
    assert.strictEqual(summary.transactionCount, 8);
    assert.strictEqual(summary.highestSpendingCategory, 'Food');
  });
});
