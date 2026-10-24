const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Public Authentication Routes
 */
router.post('/register', register);
router.post('/login', login);

/**
 * Protected Authentication Routes
 */
router.get('/me', protect, getMe);

module.exports = router;
