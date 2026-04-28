const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const User = require('../models/user.model');
const emailService = require('./email.service');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(config.google.clientId);

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        id: user._id,
        email: user.email 
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { username, email, password, number } = userData;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      number,
    });

    await user.save();

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(email, username).catch(err => {
      logger.error('Welcome email failed:', err);
    });

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: user.toPublicJSON(),
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Validate password
      const isValid = await user.validatePassword(password);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }

      // Update last seen
      user.lastSeen = new Date();
      await user.save();

      // Generate token
      const token = this.generateToken(user);

      return {
        token,
        user: user.toPublicJSON(),
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Google OAuth authentication
   */
  async googleAuth(googleToken) {
    try {
      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: config.google.clientId,
      });

      const { email, name, sub } = ticket.getPayload();

      // Find or create user
      let user = await User.findOne({ $or: [{ email }, { googleId: sub }] });

      if (!user) {
        user = await User.create({
          email,
          username: name,
          googleId: sub,
          password: Math.random().toString(36).slice(-8), // Random password for Google users
        });

        // Send welcome email
        emailService.sendWelcomeEmail(email, name).catch(err => {
          logger.error('Welcome email failed:', err);
        });
      } else if (!user.googleId) {
        // Link Google account to existing user
        user.googleId = sub;
        await user.save();
      }

      // Update last seen
      user.lastSeen = new Date();
      await user.save();

      // Generate token
      const token = this.generateToken(user);

      return {
        token,
        user: user.toPublicJSON(),
      };
    } catch (error) {
      logger.error('Google auth error:', error);
      throw new Error('Google authentication failed');
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new AuthService();
