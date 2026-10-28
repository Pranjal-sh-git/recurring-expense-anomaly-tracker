const express = require('express');
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions
} = require('../controllers/transactionController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply canonical authentication middleware to all transaction routes
router.use(protect);

// Collection routes
router.route('/')
  .get(getTransactions)
  .post(createTransaction);

// Batch import routes (declared before :id parameter route)
router.post('/import', importTransactions);
router.post('/bulk', importTransactions);

// Single transaction routes
router.route('/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
