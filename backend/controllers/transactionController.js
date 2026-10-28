const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

/**
 * Helper to ensure user is authenticated and extract user ID
 * @param {import('express').Request} req
 * @returns {string|null}
 */
const getUserId = (req) => {
  if (!req.user) return null;
  return (req.user.id || req.user._id ? (req.user.id || req.user._id).toString() : null);
};

/**
 * Validates whether an ID is a valid 24-character hexadecimal MongoDB ObjectId
 * @param {*} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id) && mongoose.Types.ObjectId.isValid(id);
};

/**
 * Helper to parse and validate a date input
 * @param {*} dateVal
 * @returns {Date|null}
 */
const parseValidDate = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * @desc    Get all transactions for the authenticated user
 * @route   GET /api/transactions
 * @access  Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID not found'
      });
    }

    const query = { user: userId };

    // Support from/to and startDate/endDate date filters
    const fromVal = req.query.from || req.query.startDate;
    const toVal = req.query.to || req.query.endDate;

    if (fromVal || toVal) {
      query.date = {};

      if (fromVal) {
        const parsedFrom = parseValidDate(fromVal);
        if (!parsedFrom) {
          return res.status(400).json({
            success: false,
            message: 'Invalid from / startDate format'
          });
        }
        query.date.$gte = parsedFrom;
      }

      if (toVal) {
        let parsedTo;
        const trimmedTo = String(toVal).trim();
        // If YYYY-MM-DD format (10 chars), extend to end of day in UTC
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedTo)) {
          parsedTo = new Date(`${trimmedTo}T23:59:59.999Z`);
        } else {
          parsedTo = parseValidDate(toVal);
        }

        if (!parsedTo || isNaN(parsedTo.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid to / endDate format'
          });
        }
        query.date.$lte = parsedTo;
      }
    }

    // Category filter
    if (req.query.category && typeof req.query.category === 'string' && req.query.category.trim()) {
      query.category = req.query.category.trim();
    }

    // Recurring filter
    if (req.query.recurring !== undefined) {
      if (req.query.recurring === 'true' || req.query.recurring === true) {
        query.recurring = true;
      } else if (req.query.recurring === 'false' || req.query.recurring === false) {
        query.recurring = false;
      }
    }

    // Anomaly filter
    if (req.query.isAnomaly !== undefined) {
      if (req.query.isAnomaly === 'true' || req.query.isAnomaly === true) {
        query.isAnomaly = true;
      } else if (req.query.isAnomaly === 'false' || req.query.isAnomaly === false) {
        query.isAnomaly = false;
      }
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    // Sorting
    const allowedSortFields = ['date', 'amount', 'title', 'createdAt'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(query),
      Transaction.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single transaction by ID
 * @route   GET /api/transactions/:id
 * @access  Private
 */
const getTransactionById = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID not found'
      });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findOne({ _id: id, user: userId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new transaction
 * @route   POST /api/transactions
 * @access  Private
 */
const createTransaction = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID not found'
      });
    }

    const { title, amount, category, date, recurring, description } = req.body;

    // Field validations
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must not be empty'
      });
    }

    if (amount === undefined || amount === null || typeof amount === 'symbol') {
      return res.status(400).json({
        success: false,
        message: 'Amount is required'
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive finite number greater than zero'
      });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required and must not be empty'
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const parsedDate = parseValidDate(date);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Always assign ownership strictly to req.user.id, ignoring any input user/userId
    const transaction = await Transaction.create({
      user: userId,
      title: title.trim(),
      amount: numAmount,
      category: category.trim(),
      date: parsedDate,
      recurring: Boolean(recurring),
      description: typeof description === 'string' ? description.trim() : ''
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate transaction record already exists'
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Update an existing transaction
 * @route   PUT /api/transactions/:id
 * @access  Private
 */
const updateTransaction = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID not found'
      });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findOne({ _id: id, user: userId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Strictly protect and preserve record ownership (user/userId cannot be updated)
    const { title, amount, category, date, recurring, description } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title must not be empty'
        });
      }
      transaction.title = title.trim();
    }

    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive finite number greater than zero'
        });
      }
      transaction.amount = numAmount;
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category must not be empty'
        });
      }
      transaction.category = category.trim();
    }

    if (date !== undefined) {
      const parsedDate = parseValidDate(date);
      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      transaction.date = parsedDate;
    }

    if (recurring !== undefined) {
      transaction.recurring = Boolean(recurring);
    }

    if (description !== undefined) {
      transaction.description = typeof description === 'string' ? description.trim() : '';
    }

    // Ownership (transaction.user) is preserved and never modified
    await transaction.save();

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate transaction record already exists'
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete an existing transaction
 * @route   DELETE /api/transactions/:id
 * @access  Private
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID not found'
      });
    }

    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    const transaction = await Transaction.findOneAndDelete({ _id: id, user: userId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {
        id: transaction._id.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Batch import transactions with pre-validation and duplicate handling
 * @route   POST /api/transactions/import (and /api/transactions/bulk)
 * @access  Private
 */
const importTransactions = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user ID not found'
      });
    }

    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: transactions must be a non-empty array'
      });
    }

    // Pre-validate ALL entries before saving any (safe atomic batch rejection)
    const validationErrors = [];
    const validBatch = [];

    transactions.forEach((tx, index) => {
      const rowNum = index + 1;
      const rowErrors = [];

      if (!tx || typeof tx !== 'object') {
        validationErrors.push(`Row ${rowNum}: Transaction must be a valid object`);
        return;
      }

      // Title validation
      if (!tx.title || typeof tx.title !== 'string' || !tx.title.trim()) {
        rowErrors.push('Title is required and must not be empty');
      }

      // Amount validation
      const numAmount = Number(tx.amount);
      if (tx.amount === undefined || tx.amount === null || isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
        rowErrors.push('Amount must be a positive finite number greater than zero');
      }

      // Category validation
      if (!tx.category || typeof tx.category !== 'string' || !tx.category.trim()) {
        rowErrors.push('Category is required and must not be empty');
      }

      // Date validation
      if (!tx.date) {
        rowErrors.push('Date is required');
      } else {
        const parsedDate = parseValidDate(tx.date);
        if (!parsedDate) {
          rowErrors.push('Invalid date format');
        }
      }

      if (rowErrors.length > 0) {
        validationErrors.push(`Row ${rowNum}: ${rowErrors.join(', ')}`);
      } else {
        // Enforce user ownership strictly to req.user.id to prevent cross-user access
        validBatch.push({
          user: userId,
          title: tx.title.trim(),
          amount: numAmount,
          category: tx.category.trim(),
          date: parseValidDate(tx.date),
          recurring: Boolean(tx.recurring),
          description: typeof tx.description === 'string' ? tx.description.trim() : ''
        });
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Batch validation failed. No transactions were imported.',
        errors: validationErrors
      });
    }

    // ─── Duplicate Handling ──────────────────────────────────────────────────
    // Detect duplicate items within the batch (matching title, amount, category, and date)
    const allowDuplicates = req.query.allowDuplicates === 'true' || req.body.allowDuplicates === true;
    let finalBatch = validBatch;
    let duplicatesSkipped = 0;

    if (!allowDuplicates) {
      const seenFingerprints = new Set();
      const deduplicatedBatch = [];

      for (const item of validBatch) {
        const dateIso = item.date instanceof Date ? item.date.toISOString().split('T')[0] : String(item.date).split('T')[0];
        const fingerprint = `${item.title.toLowerCase().trim()}|${item.amount}|${item.category.toLowerCase().trim()}|${dateIso}`;

        if (seenFingerprints.has(fingerprint)) {
          duplicatesSkipped++;
          continue;
        }

        seenFingerprints.add(fingerprint);
        deduplicatedBatch.push(item);
      }

      finalBatch = deduplicatedBatch;
    }

    if (finalBatch.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All entries in the batch were duplicates. No new transactions inserted.',
        data: {
          importedCount: 0,
          duplicatesSkipped,
          transactions: []
        }
      });
    }

    // Atomic insertion of validated records
    const inserted = await Transaction.insertMany(finalBatch);

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} transactions${duplicatesSkipped > 0 ? ` (${duplicatesSkipped} duplicates skipped)` : ''}`,
      data: {
        importedCount: inserted.length,
        duplicatesSkipped,
        transactions: inserted
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate transaction record was detected during batch import'
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions
};
