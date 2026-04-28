const Message = require('../models/message.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

class MessageService {
  /**
   * Fetch messages between two users with pagination
   */
  async fetchMessages(userId, receiverId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Convert string IDs to ObjectIds if needed
    const mongoose = require('mongoose');
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const receiverObjectId = typeof receiverId === 'string' ? new mongoose.Types.ObjectId(receiverId) : receiverId;

    const messages = await Message.find({
      users: { $all: [userObjectId, receiverObjectId] },
      isDeleted: false,
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username profilePicture')
      .populate('receiverId', 'username profilePicture')
      .populate('replyTo', 'content senderId');

    const total = await Message.countDocuments({
      users: { $all: [userObjectId, receiverObjectId] },
      isDeleted: false,
    });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete message (soft delete)
   */
  async deleteMessage(messageId, userId) {
    const message = await Message.findOne({ messageId });

    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId) {
      throw new Error('Unauthorized to delete this message');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return message;
  }

  /**
   * Forward message to multiple recipients
   */
  async forwardMessage(messageId, senderId, receiverIds) {
    const originalMessage = await Message.findById(messageId);

    if (!originalMessage) {
      throw new Error('Message not found');
    }

    const forwardedMessages = [];

    for (const receiverId of receiverIds) {
      const newMessage = new Message({
        messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId,
        receiverId,
        users: [senderId, receiverId],
        content: originalMessage.content,
        forwardedFrom: originalMessage.senderId,
      });

      await newMessage.save();
      forwardedMessages.push(newMessage);
    }

    return forwardedMessages;
  }

  /**
   * Pin message
   */
  async pinMessage(messageId, senderId, receiverId) {
    const message = await Message.findOne({ messageId, senderId, receiverId });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if already pinned
    const existingPin = await Message.findOne({
      senderId,
      receiverId,
      pinnedMessage: messageId,
    });

    if (existingPin) {
      throw new Error('Message already pinned');
    }

    // Create pinned reference
    const pinnedMsg = new Message({
      messageId: `pin-${messageId}`,
      senderId,
      receiverId,
      users: [senderId, receiverId],
      content: message.content,
      pinnedMessage: messageId,
    });

    await pinnedMsg.save();

    return pinnedMsg;
  }

  /**
   * Unpin message
   */
  async unpinMessage(messageId, senderId, receiverId) {
    const pinnedMessage = await Message.findOne({
      senderId,
      receiverId,
      messageId,
    });

    if (!pinnedMessage) {
      throw new Error('Pinned message not found');
    }

    await Message.findByIdAndDelete(pinnedMessage._id);

    return { success: true };
  }

  /**
   * Fetch pinned messages
   */
  async fetchPinnedMessages(userId, receiverId) {
    const pinnedMessages = await Message.find({
      senderId: userId,
      receiverId,
      pinnedMessage: { $exists: true },
    })
      .populate('senderId', 'username profilePicture')
      .populate('receiverId', 'username profilePicture');

    return pinnedMessages;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId, senderId) {
    await Message.updateMany(
      {
        senderId,
        receiverId: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId) {
    const count = await Message.countDocuments({
      receiverId: userId,
      isRead: false,
      isDeleted: false,
    });

    return count;
  }
}

module.exports = new MessageService();
