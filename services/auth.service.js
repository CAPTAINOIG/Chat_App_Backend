const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const User = require('../models/user.model');
const emailService = require('./email.service');
const logger = require('../utils/logger');

const googleClient = config.google.clientId ? new OAuth2Client(config.google.clientId) : null;

class AuthService {
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

  async register(userData) {
    const { username, email, password, number } = userData;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }
    const user = new User({ username, email, password, number });
    await user.save();
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

  async login(email, password) {
    try {
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
      throw error;
    }
  }

  async googleAuth(googleToken) {
    try {
      // Check if Google auth is configured
      if (!googleClient) {
        throw new Error('Google authentication is not configured');
      }
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
      
      // More specific error messages for debugging
      if (error.message.includes('Token used too early')) {
        throw new Error('Google token is not yet valid');
      } else if (error.message.includes('Token used too late')) {
        throw new Error('Google token has expired');
      } else if (error.message.includes('Invalid token signature')) {
        throw new Error('Invalid Google token signature');
      } else if (error.message.includes('Wrong recipient')) {
        throw new Error('Google token audience mismatch');
      } else {
        throw new Error(`Google authentication failed: ${error.message}`);
      }
    }
  }

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

  async forgotPassword(email, resetToken, expirationDate) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      user.otp = resetToken;
      user.otpExpiration = expirationDate;
      await user.save();
      emailService.sendPasswordResetEmail(email, resetToken).catch(err => {
        logger.error('Password Reset Failed', err)
      })
      return {
        token:resetToken,
        user: user.toPublicJSON(),
        expirationDate,
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword (otp, password, newPassword) {
    try {
      const user = await User.findOne({ otp });
      if (!user) {
        throw new Error('Invalid OTP');
      }
      const isValid = await user.validatePassword(password);
      if (!isValid) {
        throw new Error('Invalid OTP or password');
      }
      user.password = await bcrypt.hash(newPassword, saltRounds);
      await user.save();
      return {
        message: 'Password reset successful',
      };
    } catch (error) {
      throw error;
    }
  }
}



module.exports = new AuthService();
