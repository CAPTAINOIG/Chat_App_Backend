const Message = require('../models/message.model');
const User = require('../models/user.model');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const logger = require('../utils/logger');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map();
  }

  /**
   * Initialize socket handlers
   */
  initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`User connected: ${socket.id}`);

      // Handle user authentication and online status
      this.handleUserOnline(socket);

      // Handle typing indicators
      this.handleTyping(socket);

      // Handle chat messages
      this.handleChatMessage(socket);

      // Handle get users
      this.handleGetUsers(socket);

      // Handle disconnect
      this.handleDisconnect(socket);
    });
  }

  /**
   * Handle user coming online
   */
  handleUserOnline(socket) {
    socket.on('user-online', async (userId) => {
      try {
        this.onlineUsers.set(userId, socket.id);
        await userService.updateOnlineStatus(userId, true);
        await userService.updateSocketId(userId, socket.id);
        
        this.broadcastOnlineUsers();
        logger.info(`User ${userId} is now online`);
      } catch (error) {
        logger.error('User online error:', error);
      }
    });
  }

  /**
   * Handle typing indicators
   */
  handleTyping(socket) {
    socket.on('typing', ({ senderId, receiverId }) => {
      const receiverSocketId = this.onlineUsers.get(receiverId);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit('typing', { senderId, receiverId });
      }
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const receiverSocketId = this.onlineUsers.get(receiverId);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit('stopTyping', { senderId, receiverId });
      }
    });
  }

  /**
   * Handle chat messages
   */
  handleChatMessage(socket) {
    socket.on('chat message', async ({ messageId, senderId, receiverId, content, replyTo }) => {
      try {
        // Validate input
        if (!senderId || !receiverId || !content) {
          socket.emit('messageError', {
            success: false,
            error: 'Missing required fields',
          });
          return;
        }

        // Convert string IDs to ObjectIds
        const mongoose = require('mongoose');
        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

        // Create message
        const message = new Message({
          messageId: messageId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          senderId: senderObjectId,
          receiverId: receiverObjectId,
          content,
          replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : null,
          users: [senderObjectId, receiverObjectId],
        });

        const savedMessage = await message.save();

        // Populate the saved message with user data to match API response
        await savedMessage.populate([
          { path: 'senderId', select: 'username profilePicture' },
          { path: 'receiverId', select: 'username profilePicture' }
        ]);

        // Send to receiver if online
        const receiverSocketId = this.onlineUsers.get(receiverId);
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('receiveMessage', {
            _id: savedMessage._id,
            messageId: savedMessage.messageId,
            senderId: savedMessage.senderId,
            receiverId: savedMessage.receiverId,
            content: savedMessage.content,
            replyTo: savedMessage.replyTo,
            timestamp: savedMessage.timestamp,
          });
        }

        // Confirm to sender
        socket.emit('messageSent', {
          success: true,
          message: 'Message sent successfully',
          userMessage: {
            _id: savedMessage._id,
            messageId: savedMessage.messageId,
            senderId: savedMessage.senderId,
            receiverId: savedMessage.receiverId,
            content: savedMessage.content,
            timestamp: savedMessage.timestamp,
          },
        });

        logger.info(`Message sent from ${senderId} to ${receiverId}`);
      } catch (error) {
        logger.error('Chat message error:', error);
        socket.emit('messageError', {
          success: false,
          error: error.message,
        });
      }
    });
  }

  /**
   * Handle get users request
   */
  handleGetUsers(socket) {
    socket.on('getUsers', async ({ token }) => {
      try {
        const user = await authService.verifyToken(token);
        
        // Update socket ID
        await userService.updateSocketId(user._id, socket.id);
        await userService.updateOnlineStatus(user._id, true);
        
        // Get all users
        const result = await userService.getAllUsers(1, 100, user._id);
        
        socket.emit('getUsers', {
          success: true,
          message: 'Users retrieved',
          users: result.users,
        });
      } catch (error) {
        logger.error('Get users error:', error);
        socket.emit('getUsers', {
          success: false,
          message: 'Error occurred',
        });
      }
    });
  }

  /**
   * Handle user disconnect
   */
  handleDisconnect(socket) {
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${socket.id}`);

      // Find and remove user from online users
      for (let [userId, sockId] of this.onlineUsers.entries()) {
        if (sockId === socket.id) {
          this.onlineUsers.delete(userId);
          
          try {
            await userService.updateOnlineStatus(userId, false);
            logger.info(`User ${userId} is now offline`);
          } catch (error) {
            logger.error('Update offline status error:', error);
          }
          
          break;
        }
      }

      this.broadcastOnlineUsers();
    });
  }

  /**
   * Broadcast online users to all connected clients
   */
  broadcastOnlineUsers() {
    const onlineUserIds = Array.from(this.onlineUsers.keys());
    this.io.emit('update-online-users', onlineUserIds);
    logger.debug(`Broadcasting ${onlineUserIds.length} online users`);
  }

  /**
   * Get online users map
   */
  getOnlineUsers() {
    return this.onlineUsers;
  }
}

module.exports = SocketHandler;
