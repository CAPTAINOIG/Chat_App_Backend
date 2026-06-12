const User = require('../models/user.model');
const cloudinary = require('cloudinary').v2;
const config = require('../config');
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

class UserService {
  async getAllUsers(page = 1, limit = 50, excludeUserId = null) {
    const skip = (page - 1) * limit;
    const query = excludeUserId ? { _id: { $ne: excludeUserId } } : {};
    const users = await User.find(query)
      .select('-password')
      .sort({ isOnline: -1, lastSeen: -1 })
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments(query);
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId) {
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async searchUsers(query, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .select('-password')
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    });
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  //  * Update profile picture
  async updateProfilePicture(userId, base64Image) {
    try {
      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(base64Image, {
        folder: 'chat-app/profiles',
        transformation: [
          { width: 400, height: 400, crop: 'fill' },
          { quality: 'auto' },
        ],
      });
      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        { profilePicture: uploadResult.secure_url },
        { new: true }
      ).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error('Failed to upload profile picture');
    }
  }

  //  * Update user profile
  async updateProfile(userId, updates) {
    const allowedUpdates = ['profileName', 'aboutMe'];
    const filteredUpdates = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  //  * Update user online status
  async updateOnlineStatus(userId, isOnline) {
    const update = {
      isOnline,
      lastSeen: new Date(),
    };
    await User.findByIdAndUpdate(userId, update);
  }

  //  Update socket ID
  async updateSocketId(userId, socketId) {
    await User.findByIdAndUpdate(userId, { socketId });
  }
  //  Get online users
  async getOnlineUsers() {
    const users = await User.find({ isOnline: true })
      .select('_id username profilePicture');
    return users;
  }
}

module.exports = new UserService();
