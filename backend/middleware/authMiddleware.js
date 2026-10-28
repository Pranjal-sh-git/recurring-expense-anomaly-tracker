const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT Authentication Protection Middleware
 *
 * Enforces:
 *   1. Presence and structure of Authorization header (Bearer <token>)
 *   2. Cryptographic signature and expiration check via JWT_SECRET
 *   3. Active user existence verification in MongoDB
 *   4. Injection of authenticated user ID into req.user.id and req.user
 *
 * Conforms to KharchaSense Backend API Contract (Section 3.2).
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for standard Authorization: Bearer <token>
    if (
      req.headers &&
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Token missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Authorization token missing or invalid.'
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[Security Alert] JWT_SECRET is not configured in environment.');
      return res.status(500).json({
        success: false,
        message: 'Internal server error: Authentication configuration missing'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token has expired'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token is invalid'
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token payload'
      });
    }

    // Verify user exists in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user no longer exists'
      });
    }

    // Set req.user and req.user.id for downstream route controllers
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    };
    req.userId = user._id.toString();

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Support both destructured import ({ protect }) and direct import (protect)
protect.protect = protect;
protect.default = protect;

module.exports = protect;
