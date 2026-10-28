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

  it('rejects unauthenticated requests at router middleware level', async () => {
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

    await authLayer.handle(req, res, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCalled, 401);
    assert.strictEqual(jsonPayload.success, false);
  });

  it('allows valid Bearer JWT authenticated requests through router middleware layer', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_analytics_unit_tests';
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');

    const validToken = jwt.sign({ id: TEST_USER_ID }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Mock User.findById for unit testing without live DB dependency
    const originalFindById = User.findById;
    User.findById = async (id) => {
      if (id === TEST_USER_ID) {
        return {
          _id: id,
          name: 'Test Analyst',
          email: 'analyst@example.com'
        };
      }
      return null;
    };

    try {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const authLayer = analyticsRoutes.stack.find(layer => !layer.route);
      assert.notStrictEqual(authLayer, undefined);

      await authLayer.handle(req, res, next);

      assert.strictEqual(nextCalled, true, 'Next must be called when valid token is supplied');
      assert.strictEqual(req.user.id, TEST_USER_ID, 'Authenticated user ID must match');
    } finally {
      User.findById = originalFindById;
    }
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

  it('rejects fetchTransactions if userId is missing', async () => {
    const mockModel = {
      find() { return { lean() { return { exec: async () => [] }; } }; }
    };
    await assert.rejects(
      async () => {
        await analyticsService.fetchTransactions({ userId: null, Model: mockModel });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.message.includes('User ID is required'), true);
        return true;
      }
    );
  });
});

// ─── 10. Multi-Tenant User Isolation Tests ────────────────────────────────────

describe('Multi-Tenant User Isolation & Boundary Enforcement', () => {
  const USER_A = '671ad4ef8c983a54b3d11a21';
  const USER_B = '671ad4ef8c983a54b3d11b99';
  const USER_C = '671ad4ef8c983a54b3d11c00';

  const MULTI_TENANT_FIXTURES = [
    {
      user: USER_A,
      title: 'Groceries Supermarket',
      amount: 100.00,
      category: 'Food',
      date: '2026-10-01T10:00:00.000Z',
      recurring: false
    },
    {
      user: USER_A,
      title: 'Broadband',
      amount: 50.00,
      category: 'Utilities',
      date: '2026-10-02T10:00:00.000Z',
      recurring: true
    },
    {
      user: USER_A,
      title: 'Lunch Cafe',
      amount: 25.00,
      category: 'Food',
      date: '2026-10-03T10:00:00.000Z',
      recurring: false
    },
    {
      user: USER_B,
      title: 'Concert Tickets',
      amount: 200.00,
      category: 'Entertainment',
      date: '2026-10-01T14:00:00.000Z',
      recurring: false
    },
    {
      userId: USER_B,
      title: 'Flight Reservation',
      amount: 300.00,
      category: 'Travel',
      date: '2026-10-05T12:00:00.000Z',
      recurring: false
    }
  ];

  it('strictly isolates User A summary from User B transactions', async () => {
    const summaryA = await analyticsService.getSummary({
      userId: USER_A,
      transactions: MULTI_TENANT_FIXTURES
    });

    // User A: 100 + 50 + 25 = 175.00, count 3
    assert.strictEqual(summaryA.totalSpending, 175.00);
    assert.strictEqual(summaryA.transactionCount, 3);
    assert.strictEqual(summaryA.highestSpendingCategory, 'Food');
    assert.strictEqual(summaryA.recurringSpend, 50.00);
    assert.strictEqual(summaryA.recurringCount, 1);
  });

  it('strictly isolates User B categories from User A categories', async () => {
    const catB = await analyticsService.getCategories({
      userId: USER_B,
      transactions: MULTI_TENANT_FIXTURES
    });

    // User B: 200 Entertainment + 300 Travel = 500.00, count 2
    assert.strictEqual(catB.totalSpending, 500.00);
    assert.strictEqual(catB.totalCount, 2);
    assert.deepStrictEqual(Object.keys(catB.totals).sort(), ['Entertainment', 'Travel']);
    assert.strictEqual(catB.totals['Entertainment'], 200.00);
    assert.strictEqual(catB.totals['Travel'], 300.00);
    // Food and Utilities must not exist in User B metrics
    assert.strictEqual(catB.totals['Food'], undefined);
    assert.strictEqual(catB.totals['Utilities'], undefined);
  });

  it('returns safe empty zeros for User C who has no recorded expenses', async () => {
    const summaryC = await analyticsService.getSummary({
      userId: USER_C,
      transactions: MULTI_TENANT_FIXTURES
    });

    assert.strictEqual(summaryC.totalSpending, 0);
    assert.strictEqual(summaryC.transactionCount, 0);
    assert.strictEqual(summaryC.highestSpendingCategory, null);
    assert.strictEqual(summaryC.averageTransactionSize, 0);
    assert.strictEqual(Number.isNaN(summaryC.averageTransactionSize), false);

    const trendsC = await analyticsService.getTrends({
      userId: USER_C,
      transactions: MULTI_TENANT_FIXTURES
    });
    assert.deepStrictEqual(trendsC.trends, []);
    assert.deepStrictEqual(trendsC.labels, []);

    const recurringC = await analyticsService.getRecurring({
      userId: USER_C,
      transactions: MULTI_TENANT_FIXTURES
    });
    assert.strictEqual(recurringC.recurringSpend, 0);
    assert.strictEqual(recurringC.oneOffSpend, 0);
    assert.strictEqual(recurringC.totalSpending, 0);
  });

  it('scopes MongoDB find query strictly with user property', async () => {
    let capturedQuery;
    const mockModel = {
      schema: { paths: { user: true } },
      find(q) {
        capturedQuery = q;
        return { lean() { return { exec: async () => [] }; } };
      }
    };

    await analyticsService.getSummary({
      userId: USER_A,
      Model: mockModel
    });

    assert.deepStrictEqual(capturedQuery.user, USER_A);
  });
});

// ─── 11. Statistical Calculations (Mean & Standard Deviation) ─────────────────

describe('Statistical Metrics (Mean & Standard Deviation)', () => {
  it('calculates mean accurately for empty, single, and multiple amounts', () => {
    assert.strictEqual(analyticsService.calculateMean([]), 0);
    assert.strictEqual(analyticsService.calculateMean(null), 0);
    assert.strictEqual(analyticsService.calculateMean([50]), 50);
    assert.strictEqual(analyticsService.calculateMean([10, 20, 30, 40]), 25);
    // Object transactions
    assert.strictEqual(
      analyticsService.calculateMean([{ amount: 15 }, { amount: 35 }]),
      25
    );
  });

  it('calculates standard deviation accurately', () => {
    // 0 or 1 item: stdDev = 0
    assert.strictEqual(analyticsService.calculateStandardDeviation([]), 0);
    assert.strictEqual(analyticsService.calculateStandardDeviation([100]), 0);

    // Identical amounts: stdDev = 0
    assert.strictEqual(analyticsService.calculateStandardDeviation([50, 50, 50, 50]), 0);

    // Known values: [10, 20, 30] -> mean = 20, variance = (100 + 0 + 100) / 3 = 66.6667, stdDev = 8.16
    assert.strictEqual(analyticsService.calculateStandardDeviation([10, 20, 30]), 8.16);

    // Transactions array input
    const txList = [{ amount: 10 }, { amount: 20 }, { amount: 30 }];
    assert.strictEqual(analyticsService.calculateStandardDeviation(txList), 8.16);
  });
});

// ─── 12. Frontend Dashboard & Charts Compatibility Envelopes ──────────────────

describe('Frontend Dashboard & Charts JSON Compatibility', () => {
  it('provides dashboardSummary with all expected metrics', () => {
    const dashSummary = analyticsService.generateDashboardSummary(DETERMINISTIC_TRANSACTIONS);

    assert.strictEqual(dashSummary.totalExpenses, 406.00);
    assert.strictEqual(dashSummary.totalSpending, 406.00);
    assert.strictEqual(dashSummary.totalTransactions, 8);
    assert.strictEqual(dashSummary.transactionCount, 8);
    assert.strictEqual(dashSummary.highestSpendingCategory, 'Food');
    assert.strictEqual(dashSummary.averageTransactionSize, 50.75);
    assert.strictEqual(dashSummary.averageAmount, 50.75);
    assert.strictEqual(dashSummary.recurringSpend, 125.00);
    assert.strictEqual(dashSummary.recurringCount, 3);
    assert.strictEqual(typeof dashSummary.standardDeviation, 'number');
  });

  it('includes Chart.js compatible datasets in category metrics', () => {
    const catData = analyticsService.calculateCategoryMetrics(DETERMINISTIC_TRANSACTIONS);

    assert.strictEqual(Array.isArray(catData.datasets), true);
    assert.strictEqual(catData.datasets.length, 1);
    assert.strictEqual(catData.datasets[0].label, 'Spending by Category');
    assert.strictEqual(catData.datasets[0].data.length, catData.labels.length);
    assert.strictEqual(catData.datasets[0].data[0], catData.categories[0].total);
    assert.strictEqual(typeof catData.averages, 'object');
    assert.strictEqual(typeof catData.standardDeviations, 'object');
  });

  it('includes Chart.js compatible datasets in daily trends', () => {
    const trendData = analyticsService.calculateTrends(DETERMINISTIC_TRANSACTIONS);

    assert.strictEqual(Array.isArray(trendData.datasets), true);
    assert.strictEqual(trendData.datasets.length, 1);
    assert.strictEqual(trendData.datasets[0].label, 'Daily Spending');
    assert.strictEqual(trendData.datasets[0].data.length, trendData.labels.length);
    assert.strictEqual(trendData.datasets[0].data[0], trendData.trends[0].total);
    assert.strictEqual(Array.isArray(trendData.timeline), true);
  });

  it('includes recurring spend, one-off spend, and percentage aliases', () => {
    const recData = analyticsService.calculateRecurringTotals(DETERMINISTIC_TRANSACTIONS);

    assert.strictEqual(recData.recurringSpend, 125.00);
    assert.strictEqual(recData.recurringTotal, 125.00);
    assert.strictEqual(recData.recurringCount, 3);
    assert.strictEqual(recData.recurringPct, 30.79);
    assert.strictEqual(recData.oneOffSpend, 281.00);
    assert.strictEqual(recData.oneOffTotal, 281.00);
    assert.strictEqual(recData.oneOffCount, 5);
    assert.strictEqual(recData.oneOffPct, 69.21);
    assert.strictEqual(recData.oneOff.amount, 281.00);
  });
});

// ─── 13. Controller Request Handlers for All 4 Endpoints ───────────────────────

describe('Controller Handlers for All 4 Analytics Endpoints', () => {
  function createMockContext(query = {}, user = { id: TEST_USER_ID }) {
    let statusCode = 200;
    let jsonResponse = null;

    const req = {
      user,
      query
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonResponse = payload;
        return this;
      }
    };

    return { req, res, getStatus: () => statusCode, getJson: () => jsonResponse };
  }

  it('GET /api/analytics/summary returns 200 with standard envelope', async () => {
    const ctx = createMockContext();
    const originalGetSummary = analyticsService.getSummary;
    analyticsService.getSummary = async () => analyticsService.generateSummaryMetrics(DETERMINISTIC_TRANSACTIONS);

    try {
      await analyticsController.getSummary(ctx.req, ctx.res);
      assert.strictEqual(ctx.getStatus(), 200);
      const json = ctx.getJson();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.message, 'Analytics summary retrieved successfully');
      assert.strictEqual(json.data.totalSpending, 406.00);
    } finally {
      analyticsService.getSummary = originalGetSummary;
    }
  });

  it('GET /api/analytics/categories returns 200 with standard envelope', async () => {
    const ctx = createMockContext();
    const originalGetCategories = analyticsService.getCategories;
    analyticsService.getCategories = async () => analyticsService.calculateCategoryMetrics(DETERMINISTIC_TRANSACTIONS);

    try {
      await analyticsController.getCategories(ctx.req, ctx.res);
      assert.strictEqual(ctx.getStatus(), 200);
      const json = ctx.getJson();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.message, 'Category analytics retrieved successfully');
      assert.strictEqual(json.data.categories.length, 6);
    } finally {
      analyticsService.getCategories = originalGetCategories;
    }
  });

  it('GET /api/analytics/trends returns 200 with standard envelope', async () => {
    const ctx = createMockContext();
    const originalGetTrends = analyticsService.getTrends;
    analyticsService.getTrends = async () => analyticsService.calculateTrends(DETERMINISTIC_TRANSACTIONS);

    try {
      await analyticsController.getTrends(ctx.req, ctx.res);
      assert.strictEqual(ctx.getStatus(), 200);
      const json = ctx.getJson();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.message, 'Spending trends retrieved successfully');
      assert.strictEqual(json.data.trends.length, 7);
    } finally {
      analyticsService.getTrends = originalGetTrends;
    }
  });

  it('GET /api/analytics/recurring returns 200 with standard envelope', async () => {
    const ctx = createMockContext();
    const originalGetRecurring = analyticsService.getRecurring;
    analyticsService.getRecurring = async () => analyticsService.calculateRecurringTotals(DETERMINISTIC_TRANSACTIONS);

    try {
      await analyticsController.getRecurring(ctx.req, ctx.res);
      assert.strictEqual(ctx.getStatus(), 200);
      const json = ctx.getJson();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.message, 'Recurring expense analytics retrieved successfully');
      assert.strictEqual(json.data.recurringSpend, 125.00);
    } finally {
      analyticsService.getRecurring = originalGetRecurring;
    }
  });

  it('All 4 endpoints reject unauthenticated requests with 401', async () => {
    const endpoints = [
      analyticsController.getSummary,
      analyticsController.getCategories,
      analyticsController.getTrends,
      analyticsController.getRecurring
    ];

    for (const handler of endpoints) {
      const ctx = createMockContext({}, null);
      await handler(ctx.req, ctx.res);
      assert.strictEqual(ctx.getStatus(), 401);
      assert.strictEqual(ctx.getJson().success, false);
    }
  });

  it('All 4 endpoints reject invalid query date ranges with 400', async () => {
    const endpoints = [
      analyticsController.getSummary,
      analyticsController.getCategories,
      analyticsController.getTrends,
      analyticsController.getRecurring
    ];

    for (const handler of endpoints) {
      const ctx = createMockContext({ from: 'bad-date' });
      await handler(ctx.req, ctx.res);
      assert.strictEqual(ctx.getStatus(), 400);
      assert.strictEqual(ctx.getJson().success, false);
    }
  });

  it('canonical protect middleware allows authenticated requests with valid signed JWT', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_analytics_unit_tests';
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const { protect } = require('../middleware/authMiddleware');

    const validToken = jwt.sign({ id: TEST_USER_ID }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const originalFindById = User.findById;
    User.findById = async (id) => {
      if (id === TEST_USER_ID) {
        return {
          _id: id,
          name: 'Test Analyst',
          email: 'analyst@example.com'
        };
      }
      return null;
    };

    try {
      const req = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      const res = {};
      let nextCalled = false;

      await protect(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.id, TEST_USER_ID);
    } finally {
      User.findById = originalFindById;
    }
  });
});
