const Message = require('../models/message.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

class MessageService {
  constructor() {
    this.messageQueue = new Map(); // For handling message delivery
    this.deliveryCallbacks = new Map(); // For message acknowledgments
  }

  /**
   * Create and save a new message with optimized performance
   */
  async createMessage(messageData) {
    const { messageId, senderId, receiverId, content, replyTo } = messageData;
    
    // Convert string IDs to ObjectIds if needed
    const mongoose = require('mongoose');
    const senderObjectId = typeof senderId === 'string' ? new mongoose.Types.ObjectId(senderId) : senderId;
    const receiverObjectId = typeof receiverId === 'string' ? new mongoose.Types.ObjectId(receiverId) : receiverId;

    const message = new Message({
      messageId: messageId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: senderObjectId,
      receiverId: receiverObjectId,
      content,
      replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : null,
      users: [senderObjectId, receiverObjectId],
      deliveryStatus: 'sent', // Track delivery status
    });

    const savedMessage = await message.save();

    // Populate the saved message for immediate use
    await savedMessage.populate([
      { path: 'senderId', select: 'username profilePicture' },
      { path: 'receiverId', select: 'username profilePicture' },
      { path: 'replyTo', select: 'content senderId' }
    ]);

    return savedMessage;
  }

  /**
   * Fetch messages between two users with pagination (optimized)
   */
  async fetchMessages(userId, receiverId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Convert string IDs to ObjectIds if needed
    const mongoose = require('mongoose');
    const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const receiverObjectId = typeof receiverId === 'string' ? new mongoose.Types.ObjectId(receiverId) : receiverId;

    // Use aggregation for better performance
    const pipeline = [
      {
        $match: {
          users: { $all: [userObjectId, receiverObjectId] },
          isDeleted: false,
          pinnedMessage: { $exists: false }, // Exclude pinned message references
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'sender',
          pipeline: [{ $project: { username: 1, profilePicture: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'receiverId',
          foreignField: '_id',
          as: 'receiver',
          pipeline: [{ $project: { username: 1, profilePicture: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'replyTo',
          foreignField: '_id',
          as: 'replyToMessage',
          pipeline: [{ $project: { content: 1, senderId: 1 } }]
        }
      },
      {
        $addFields: {
          senderId: { $arrayElemAt: ['$sender', 0] },
          receiverId: { $arrayElemAt: ['$receiver', 0] },
          replyTo: { $arrayElemAt: ['$replyToMessage', 0] }
        }
      },
      {
        $project: {
          sender: 0,
          receiver: 0,
          replyToMessage: 0
        }
      }
    ];

    const [messages, totalResult] = await Promise.all([
      Message.aggregate(pipeline),
      Message.countDocuments({
        users: { $all: [userObjectId, receiverObjectId] },
        isDeleted: false,
        pinnedMessage: { $exists: false }, // Exclude pinned message references
      })
    ]);

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total: totalResult,
        pages: Math.ceil(totalResult / limit),
      },
    };
  }

  /**
   * Update message delivery status
   */
  async updateDeliveryStatus(messageId, status) {
    await Message.findOneAndUpdate(
      { messageId },
      { 
        deliveryStatus: status,
        deliveredAt: status === 'delivered' ? new Date() : undefined
      }
    );
  }

  /**
   * Delete message (soft delete) with real-time notification
   */
  async deleteMessage(messageId, userId) {
    const message = await Message.findOne({ messageId }).populate('receiverId', '_id');

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

    // Return message with receiver info for socket notification
    return {
      messageId: message.messageId,
      senderId: message.senderId.toString(),
      receiverId: message.receiverId._id.toString(),
      deletedAt: message.deletedAt
    };
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
   * Pin message (compatible with existing data)
   */
  async pinMessage(messageId, senderId, receiverId) {
    // Prevent pinning of pin references
    if (messageId.startsWith('pin-')) {
      throw new Error('Cannot pin a pinned message reference');
    }

    // Find the original message
    const message = await Message.findOne({ 
      messageId,
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ],
      pinnedMessage: { $exists: false }, // Ensure it's not a pin reference
    });
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if already pinned by this user (check existing format)
    const existingPin = await Message.findOne({
      senderId,
      receiverId,
      pinnedMessage: messageId,
    });

    if (existingPin) {
      throw new Error('Message already pinned by this user');
    }

    // Create a pin reference document (keeping existing format for compatibility)
    const pinnedMsg = new Message({
      messageId: `pin-${messageId}-${senderId}`, // Unique pin ID per user
      senderId,
      receiverId,
      users: [senderId, receiverId],
      content: message.content,
      pinnedMessage: messageId, // Reference to original message
      timestamp: message.timestamp, // Keep original timestamp
    });
    
    await pinnedMsg.save();
    
    // Populate the response
    await pinnedMsg.populate([
      { path: 'senderId', select: 'username profilePicture' },
      { path: 'receiverId', select: 'username profilePicture' }
    ]);
    
    return pinnedMsg;
  }

  async unpinMessage(messageId, senderId, receiverId) {
    let pinnedMessage = await Message.findOne({
      messageId: `pin-${messageId}-${senderId}`,
      pinnedMessage: messageId,
    });
    if (!pinnedMessage) {
      pinnedMessage = await Message.findOne({
        senderId,
        receiverId,
        pinnedMessage: messageId, // This finds pin references, not original messages
      });
    }
    if (!pinnedMessage) {
      throw new Error('Pinned message not found or you did not pin this message');
    }
    // Delete only the pin reference, not the original message
    await Message.findByIdAndDelete(pinnedMessage._id);
    return { success: true };
  }

  async fetchPinnedMessages(userId, receiverId) {
    const pinnedMessages = await Message.find({
      $or: [
        // New format
        {
          senderId: userId,
          pinnedMessage: { $exists: true },
          messageId: { $regex: `^pin-.*-${userId}$` },
        },
        // Existing format (for backward compatibility)
        {
          senderId: userId,
          receiverId,
          pinnedMessage: { $exists: true },
          messageId: { $not: { $regex: '^pin-' } }, // Exclude new format to avoid duplicates
        }
      ]
    })
      .populate('senderId', 'username profilePicture')
      .populate('receiverId', 'username profilePicture')
      .sort({ timestamp: -1 });

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
