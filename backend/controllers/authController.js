const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Email format validation regex (RFC-compliant standard)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign a JSON Web Token for the authenticated user ID.
 * Reads JWT_SECRET and JWT_EXPIRES_IN from environment variables.
 *
 * @param {string} userId - MongoDB ObjectId string
 * @returns {string} Signed JWT
 */
const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  return jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // 1. Input Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name'
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 60 characters long'
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // 2. Unique Email Check
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // 3. Create User (password hashing performed by pre-save hook)
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password
    });

    // 4. Issue JWT
    const token = signToken(user._id.toString());

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: user.toAuthJSON()
      }
    });
  } catch (error) {
    // Handle MongoDB duplicate key error code 11000
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({
        success: false,
        message: messages
      });
    }

    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again.'
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // 1. Input Validation
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Query user with password explicitly included
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // 3. Avoid verbose errors revealing account presence
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 4. Verify password hash using bcrypt.compare
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 5. Issue JWT
    const token = signToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: 'User authenticated successfully',
      data: {
        token,
        user: user.toAuthJSON()
      }
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during authentication. Please try again.'
    });
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (JWT protected)
 */
const getMe = async (req, res) => {
  try {
    // req.user.id populated by protect middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: user.toAuthJSON()
      }
    });
  } catch (error) {
    console.error('[GetMe Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving user profile.'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  signToken
};
