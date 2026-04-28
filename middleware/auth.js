const jwt = require('jsonwebtoken');
const config = require('../config');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/user.model');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ResponseHandler.unauthorized(res, 'Authorization token missing or malformed');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Attach user info to request
    const user = await User.findOne({ email: decoded.email }).select('-password');
    
    if (!user) {
      return ResponseHandler.unauthorized(res, 'User not found');
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return ResponseHandler.unauthorized(res, 'Token expired');
    }
    return ResponseHandler.unauthorized(res, 'Invalid token');
  }
});

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findOne({ email: decoded.email }).select('-password');
      if (user) {
        req.user = user;
        req.userId = user._id.toString();
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }
  next();
});

module.exports = {
  authenticate,
  optionalAuth,
};
