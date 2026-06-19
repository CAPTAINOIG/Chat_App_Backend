const Message = require('../models/message.model');
const User = require('../models/user.model');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const messageService = require('../services/message.service');
const callService = require('../services/call.service');
const logger = require('../utils/logger');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map(); 
    this.userSockets = new Map(); 
    this.messageQueue = new Map();
    this.typingUsers = new Map(); 
    // Start call cleanup timer
    callService.startCleanupTimer();
  }
 // Initialize socket handlers
  initialize() {
    this.io.on('connection', (socket) => {
    socket.on("update-show-online", async (data) => {
      const { userId, showOnline } = data;
    try {
      await User.findByIdAndUpdate(userId, {showOnline});
    } catch (error) {
    }
  });
      // Log all incoming events to see what's happening
      const originalEmit = socket.emit;
      socket.emit = (event, ...args) => {
        return originalEmit.apply(socket, [event, ...args]);
      };
      // Intercept all incoming events
      const originalOn = socket.on;
      socket.on = (event, callback) => {
        return originalOn.apply(socket, [event, (...args) => {
          console.log(`Socket ${socket.id} received event: ${event}`, args);
          callback(...args);
        }]);
      };
      try {
        // Handle user authentication and online status
        this.handleUserOnline(socket);
        // Handle typing indicators
        this.handleTyping(socket);
        // Handle chat messages
        this.handleChatMessage(socket);
        // Handle get users
        this.handleGetUsers(socket);
        // Handle message deletion
        this.handleMessageDeletion(socket);
        // Handle voice and video calls
        this.handleCalls(socket);
        // Handle WebRTC signaling
        this.handleWebRTCSignaling(socket);
        // Handle disconnect
        this.handleDisconnect(socket);
      } catch (error) {
        socket.disconnect();
      }
    });
    this.io.on('error', (error) => {
      logger.error('Socket.io server error:', error);
    });
  }

  //  Handle user coming online with improved connection management
  handleUserOnline(socket) {
    socket.on('user-online', async (userId) => {
      try {
        // Convert userId to string to avoid type mismatch
        let processedUserId = userId;
        // If userId is an object or array, maybe it's an ObjectId or something?
        if (typeof processedUserId !== 'string') {
          if (processedUserId && processedUserId.toString) {
            processedUserId = processedUserId.toString();
          } else {
            processedUserId = String(processedUserId);
          }
        }
        const stringUserId = processedUserId.trim();
        // Remove any existing connection for this user
        const existingSocketId = this.onlineUsers.get(stringUserId);
        if (existingSocketId && existingSocketId !== socket.id) {
          this.userSockets.delete(existingSocketId);
        }
        this.onlineUsers.set(stringUserId, socket.id);
        this.userSockets.set(socket.id, stringUserId);
        await userService.updateOnlineStatus(stringUserId, true);
        await userService.updateSocketId(stringUserId, socket.id);
        await this.deliverQueuedMessages(stringUserId, socket.id);
        
        this.broadcastOnlineUsers();
        socket.emit('userOnlineConfirmed', { userId: stringUserId, socketId: socket.id });
      } catch (error) {
        socket.emit('error', { message: 'Failed to set online status' });
      }
    });
  }

  handleTyping(socket) {
    socket.on('typing', ({ senderId, receiverId }) => {
      const stringSenderId = String(senderId);
      const stringReceiverId = String(receiverId);
      const conversationId = [stringSenderId, stringReceiverId].sort().join('-');
      
      if (!this.typingUsers.has(conversationId)) {
        this.typingUsers.set(conversationId, new Set());
      }
      
      this.typingUsers.get(conversationId).add(stringSenderId);
      
      const receiverSocketId = this.onlineUsers.get(stringReceiverId);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit('typing', { senderId, receiverId });
      }

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        const typingSet = this.typingUsers.get(conversationId);
        if (typingSet) {
          typingSet.delete(stringSenderId);
          if (typingSet.size === 0) {
            this.typingUsers.delete(conversationId);
          }
        }
        
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('stopTyping', { senderId, receiverId });
        }
      }, 3000);
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const stringSenderId = String(senderId);
      const stringReceiverId = String(receiverId);
      const conversationId = [stringSenderId, stringReceiverId].sort().join('-');
      const typingSet = this.typingUsers.get(conversationId);
      
      if (typingSet) {
        typingSet.delete(stringSenderId);
        if (typingSet.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }

      const receiverSocketId = this.onlineUsers.get(stringReceiverId);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit('stopTyping', { senderId, receiverId });
      }
    });
  }

  handleChatMessage(socket) {
    socket.on('chat message', async ({ messageId, senderId, receiverId, content, replyTo, type, audioUrl, duration }) => {
      try {
        if (!senderId || !receiverId) {
          socket.emit('messageError', {
            messageId,
            success: false,
            error: 'Missing required fields',
          });
          return;
        }
        
        if (type === 'text' && !content?.trim()) {
          socket.emit('messageError', {
            messageId,
            success: false,
            error: 'Text content required for text messages',
          });
          return;
        }
        
        if (type === 'voice' && !audioUrl) {
          socket.emit('messageError', {
            messageId,
            success: false,
            error: 'Audio URL required for voice messages',
          });
          return;
        }
        // Rate limiting check (simple implementation)
        const now = Date.now();
        const userLastMessage = socket.lastMessageTime || 0;
        if (now - userLastMessage < 100) { // 100ms between messages
          socket.emit('messageError', {
            messageId,
            success: false,
            error: 'Rate limit exceeded',
          });
          return;
        }
        socket.lastMessageTime = now;

        // Create message using service
        const savedMessage = await messageService.createMessage({
          messageId: messageId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          senderId,
          receiverId,
          content: type === 'text' ? content.trim() : undefined,
          replyTo,
          type: type || 'text',
          audioUrl: type === 'voice' ? audioUrl : undefined,
          duration: type === 'voice' ? duration : undefined,
        });

        // Prepare message data for transmission
        const messageData = {
          _id: savedMessage._id,
          messageId: savedMessage.messageId,
          senderId: savedMessage.senderId,
          receiverId: savedMessage.receiverId,
          content: savedMessage.content,
          replyTo: savedMessage.replyTo,
          type: savedMessage.type,
          audioUrl: savedMessage.audioUrl,
          duration: savedMessage.duration,
          timestamp: savedMessage.timestamp,
          deliveryStatus: 'sent',
        };

        // Send to receiver if online
        const stringReceiverId = String(receiverId);
        const receiverSocketId = this.onlineUsers.get(stringReceiverId);
        let delivered = false;

        if (receiverSocketId) {
          try {
            // Send with acknowledgment
            this.io.to(receiverSocketId).emit('receiveMessage', messageData, (ack) => {
              if (ack && ack.received) {
                messageService.updateDeliveryStatus(savedMessage.messageId, 'delivered');
                socket.emit('messageDelivered', { messageId: savedMessage.messageId });
              }
            });
            delivered = true;
          } catch (error) {
            logger.error('Error sending to receiver:', error);
          }
        }

        // If receiver not online, queue message
        if (!delivered) {
          this.queueMessage(receiverId, messageData);
        }

        // Confirm to sender immediately
        socket.emit('messageSent', {
          success: true,
          message: 'Message sent successfully',
          messageData,
        });
      } catch (error) {
        socket.emit('messageError', {
          messageId,
          success: false,
          error: error.message,
        });
      }
    });

    // Handle message acknowledgments
    socket.on('messageReceived', async ({ messageId }) => {
      try {
        await messageService.updateDeliveryStatus(messageId, 'delivered');
        
        // Notify sender if online
        const message = await Message.findOne({ messageId }).select('senderId');
        if (message) {
          const senderSocketId = this.onlineUsers.get(message.senderId.toString());
          if (senderSocketId) {
            this.io.to(senderSocketId).emit('messageDelivered', { messageId });
          }
        }
      } catch (error) {
        logger.error('Message received acknowledgment error:', error);
      }
    });

    // Handle message read receipts
    socket.on('messageRead', async ({ messageId }) => {
      try {
        await Message.findOneAndUpdate(
          { messageId },
          { 
            isRead: true, 
            readAt: new Date(),
            deliveryStatus: 'read'
          }
        );

        // Notify sender if online
        const message = await Message.findOne({ messageId }).select('senderId');
        if (message) {
          const senderSocketId = this.onlineUsers.get(message.senderId.toString());
          if (senderSocketId) {
            this.io.to(senderSocketId).emit('messageRead', { messageId });
          }
        }
      } catch (error) {
        logger.error('Message read receipt error:', error);
      }
    });
  }

  queueMessage(userId, messageData) {
    const stringUserId = String(userId);
    if (!this.messageQueue.has(stringUserId)) {
      this.messageQueue.set(stringUserId, []);
    }
    
    const queue = this.messageQueue.get(stringUserId);
    queue.push(messageData);
    
    // Keep only last 50 messages in queue
    if (queue.length > 50) {
      queue.shift();
    }
  }

  /**
   * Deliver queued messages when user comes online
   */
  async deliverQueuedMessages(userId, socketId) {
    const stringUserId = String(userId);
    const queue = this.messageQueue.get(stringUserId);
    if (!queue || queue.length === 0) return;

    try {
      // Send all queued messages
      for (const messageData of queue) {
        this.io.to(socketId).emit('receiveMessage', messageData);
        await messageService.updateDeliveryStatus(messageData.messageId, 'delivered');
      }

      // Clear the queue
      this.messageQueue.delete(stringUserId);
      
      logger.info(`Delivered ${queue.length} queued messages to user ${stringUserId}`);
    } catch (error) {
      logger.error('Error delivering queued messages:', error);
    }
  }

  handleGetUsers(socket) {
    socket.on('getUsers', async ({ token }) => {
      try {
        const user = await authService.verifyToken(token);
        await userService.updateSocketId(user._id, socket.id);
        await userService.updateOnlineStatus(user._id, true);
        const result = await userService.getAllUsers(1, 100, user._id);
        socket.emit('getUsers', {
          success: true,
          message: 'Users retrieved',
          users: result.users,
        });
      } catch (error) {
        socket.emit('getUsers', {
          success: false,
          message: 'Error occurred: ' + error.message,
        });
      }
    });
  }

  //  * Handle message deletion via socket
  handleMessageDeletion(socket) {
    socket.on('deleteMessage', async ({ messageId, userId }) => {
      try {
        const deletedMessage = await messageService.deleteMessage(messageId, userId);
        // Notify receiver if online
        const receiverSocketId = this.onlineUsers.get(deletedMessage.receiverId);
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('messageDeleted', {
            messageId: deletedMessage.messageId,
            senderId: deletedMessage.senderId,
            deletedAt: deletedMessage.deletedAt
          });
        }

        // Confirm to sender
        socket.emit('messageDeleteConfirmed', {
          success: true,
          messageId: deletedMessage.messageId
        });
      } catch (error) {
        socket.emit('messageDeleteError', {
          success: false,
          messageId,
          error: error.message
        });
      }
    });
  }

  /**
   * Handle voice and video calls
   */
  handleCalls(socket) {
    // Initiate a call
    socket.on('call:initiate', async ({ receiverId, callType }) => {
      try {
        const callerId = this.userSockets.get(socket.id);
        if (!callerId) {
          socket.emit('call:error', { error: 'User not authenticated' });
          return;
        }
        // Check if caller is already in a call
        if (callService.isUserInCall(callerId)) {
          socket.emit('call:error', { error: 'You are already in a call' });
          return;
        }

        // Check if receiver is already in a call
        if (callService.isUserInCall(receiverId)) {
          socket.emit('call:error', { error: 'User is already in a call' });
          return;
        }

        // Create call
        const call = callService.createCall(callerId, receiverId, callType);
        // Notify receiver if online - convert to string
        const stringReceiverId = String(receiverId);
        let receiverSocketId = this.onlineUsers.get(stringReceiverId);
        if (receiverSocketId) {
          let callerInfo;
          try {
            callerInfo = await userService.getUserById(callerId);
            logger.debug(`[call:initiate] Got callerInfo:`, callerInfo);
          } catch (err) {
            logger.error(`[call:initiate] Failed to get callerInfo:`, err);
            callerInfo = {
              _id: callerId,
              id: callerId,
              username: 'Unknown User'
            };
          }
          
          logger.debug(`[call:initiate] Emitting call:incoming to ${receiverId} (${receiverSocketId}) with data:`, {
            callId: call.callId,
            callerId,
            callerInfo,
            callType: call.callType,
            timestamp: call.startTime,
          });
          
          this.io.to(receiverSocketId).emit('call:incoming', {
            callId: call.callId,
            callerId,
            callerInfo,
            callType: call.callType,
            timestamp: call.startTime,
          });
        } else {
          // Receiver is offline, mark as missed
          callService.markCallAsMissed(call.callId);
          socket.emit('call:missed', { callId: call.callId });
          return;
        }

        // Confirm to caller
        logger.debug(`[call:initiate] Emitting call:initiated to caller ${callerId} (${socket.id})`);
        socket.emit('call:initiated', {
          callId: call.callId,
          callerId: call.callerId,
          receiverId: call.receiverId,
          callType: call.callType,
        });

        logger.info(`Call initiated: ${call.callId} from ${callerId} to ${receiverId}`);
      } catch (error) {
        logger.error('Call initiate error:', error);
        socket.emit('call:error', { error: error.message });
      }
    });

    // Accept a call
    socket.on('call:accept', async ({ callId }) => {
      try {
        const userId = this.userSockets.get(socket.id);
        logger.debug(`[call:accept] Received from ${socket.id}, userId: ${userId}, callId: ${callId}`);
        
        const call = callService.acceptCall(callId, userId);
        logger.debug(`[call:accept] Call accepted:`, call);

        // Notify caller
        const stringCallerId = String(call.callerId);
        const callerSocketId = this.onlineUsers.get(stringCallerId);
        logger.debug(`[call:accept] Caller ID (string): ${stringCallerId}, Caller socket ID: ${callerSocketId}`);
        if (callerSocketId) {
          logger.debug(`[call:accept] Emitting call:accepted to caller ${call.callerId} (${callerSocketId})`);
          this.io.to(callerSocketId).emit('call:accepted', {
            callId: call.callId,
            callerId: call.callerId,
            receiverId: call.receiverId,
            acceptedBy: userId,
          });
        }

        // Confirm to receiver
        logger.debug(`[call:accept] Emitting call:accepted to receiver ${userId} (${socket.id})`);
        socket.emit('call:accepted', {
          callId: call.callId,
          callerId: call.callerId,
          receiverId: call.receiverId,
        });

        logger.info(`Call accepted: ${callId} by ${userId}`);
      } catch (error) {
        logger.error('Call accept error:', error);
        socket.emit('call:error', { error: error.message });
      }
    });

    // Reject a call
    socket.on('call:reject', async ({ callId }) => {
      try {
        const userId = this.userSockets.get(socket.id);
        logger.debug(`[call:reject] Received from ${socket.id}, userId: ${userId}, callId: ${callId}`);
        
        const call = callService.rejectCall(callId, userId);
        logger.debug(`[call:reject] Call rejected:`, call);

        // Notify caller
        const stringCallerId = String(call.callerId);
        const callerSocketId = this.onlineUsers.get(stringCallerId);
        logger.debug(`[call:reject] Caller ID (string): ${stringCallerId}, Caller socket ID: ${callerSocketId}`);
        if (callerSocketId) {
          logger.debug(`[call:reject] Emitting call:rejected to ${call.callerId} (${callerSocketId})`);
          this.io.to(callerSocketId).emit('call:rejected', {
            callId: call.callId,
            rejectedBy: userId,
          });
        }

        logger.info(`Call rejected: ${callId} by ${userId}`);
      } catch (error) {
        logger.error('Call reject error:', error);
        socket.emit('call:error', { error: error.message });
      }
    });

    // End a call
    socket.on('call:end', async ({ callId }) => {
      try {
        const userId = this.userSockets.get(socket.id);
        logger.debug(`[call:end] Received from ${socket.id}, userId: ${userId}, callId: ${callId}`);
        
        const call = callService.endCall(callId, userId);
        logger.debug(`[call:end] Call ended:`, call);

        // Notify all participants
        call.participants.forEach(participantId => {
          if (participantId !== userId) {
            const stringParticipantId = String(participantId);
            const participantSocketId = this.onlineUsers.get(stringParticipantId);
            logger.debug(`[call:end] Notifying participant ${participantId} (string: ${stringParticipantId}, socket: ${participantSocketId})`);
            if (participantSocketId) {
              this.io.to(participantSocketId).emit('call:ended', {
                callId: call.callId,
                endedBy: userId,
                duration: call.duration,
              });
            }
          }
        });

        // Confirm to caller
        logger.debug(`[call:end] Emitting call:ended to ${userId} (${socket.id})`);
        socket.emit('call:ended', {
          callId: call.callId,
          duration: call.duration,
        });

        logger.info(`Call ended: ${callId} by ${userId}`);
      } catch (error) {
        logger.error('Call end error:', error);
        socket.emit('call:error', { error: error.message });
      }
    });

    // Get call status
    socket.on('call:status', ({ callId }) => {
      try {
        const call = callService.getCall(callId);
        socket.emit('call:status', call || { error: 'Call not found' });
      } catch (error) {
        socket.emit('call:error', { error: error.message });
      }
    });
  }

  /**
   * Handle WebRTC signaling
   */
  handleWebRTCSignaling(socket) {
    // Handle offer
    socket.on('webrtc:offer', ({ callId, offer, targetUserId }) => {
      try {
        const fromUserId = this.userSockets.get(socket.id);
        const stringTargetUserId = String(targetUserId);
        logger.debug(`[webrtc:offer] Received from ${socket.id} (${fromUserId}), callId: ${callId}, targetUserId: ${targetUserId}, stringTargetUserId: ${stringTargetUserId}`);
        
        const targetSocketId = this.onlineUsers.get(stringTargetUserId);
        logger.debug(`[webrtc:offer] Target socket ID: ${targetSocketId}`);
        
        if (targetSocketId) {
          logger.debug(`[webrtc:offer] Forwarding to ${stringTargetUserId} (${targetSocketId})`);
          this.io.to(targetSocketId).emit('webrtc:offer', {
            callId,
            offer,
            fromUserId,
          });
        } else {
          logger.warn(`[webrtc:offer] Target user ${stringTargetUserId} is not online, dropping offer`);
        }
      } catch (error) {
        logger.error('WebRTC offer error:', error);
        socket.emit('webrtc:error', { error: error.message });
      }
    });

    // Handle answer
    socket.on('webrtc:answer', ({ callId, answer, targetUserId }) => {
      try {
        const fromUserId = this.userSockets.get(socket.id);
        const stringTargetUserId = String(targetUserId);
        logger.debug(`[webrtc:answer] Received from ${socket.id} (${fromUserId}), callId: ${callId}, targetUserId: ${targetUserId}, stringTargetUserId: ${stringTargetUserId}`);
        
        const targetSocketId = this.onlineUsers.get(stringTargetUserId);
        logger.debug(`[webrtc:answer] Target socket ID: ${targetSocketId}`);
        
        if (targetSocketId) {
          logger.debug(`[webrtc:answer] Forwarding to ${stringTargetUserId} (${targetSocketId})`);
          this.io.to(targetSocketId).emit('webrtc:answer', {
            callId,
            answer,
            fromUserId,
          });
        } else {
          logger.warn(`[webrtc:answer] Target user ${stringTargetUserId} is not online, dropping answer`);
        }
      } catch (error) {
        logger.error('WebRTC answer error:', error);
        socket.emit('webrtc:error', { error: error.message });
      }
    });

    // Handle ICE candidate
    socket.on('webrtc:ice-candidate', ({ callId, candidate, targetUserId }) => {
      try {
        const fromUserId = this.userSockets.get(socket.id);
        const stringTargetUserId = String(targetUserId);
        logger.debug(`[webrtc:ice-candidate] Received from ${socket.id} (${fromUserId}), callId: ${callId}, targetUserId: ${targetUserId}, stringTargetUserId: ${stringTargetUserId}`);
        
        const targetSocketId = this.onlineUsers.get(stringTargetUserId);
        logger.debug(`[webrtc:ice-candidate] Target socket ID: ${targetSocketId}`);
        
        if (targetSocketId) {
          logger.debug(`[webrtc:ice-candidate] Forwarding to ${stringTargetUserId} (${targetSocketId})`);
          this.io.to(targetSocketId).emit('webrtc:ice-candidate', {
            callId,
            candidate,
            fromUserId,
          });
        } else {
          logger.warn(`[webrtc:ice-candidate] Target user ${stringTargetUserId} is not online, dropping ICE candidate`);
        }
      } catch (error) {
        logger.error('WebRTC ICE candidate error:', error);
        socket.emit('webrtc:error', { error: error.message });
      }
    });
  }

  /**
   * Handle user disconnect with improved cleanup
   */
  handleDisconnect(socket) {
    socket.on('disconnect', async (reason) => {
      logger.info(`User disconnected: ${socket.id}, reason: ${reason}`);

      try {
        // Find user by socket ID
        const userId = this.userSockets.get(socket.id);
        
        if (userId) {
          // Clean up user mappings
          this.onlineUsers.delete(userId);
          this.userSockets.delete(socket.id);
          
          // Clean up typing indicators
          for (const [conversationId, typingSet] of this.typingUsers.entries()) {
            typingSet.delete(userId);
            if (typingSet.size === 0) {
              this.typingUsers.delete(conversationId);
            }
          }
          
          // Handle active calls
          const activeCall = callService.getUserCall(userId);
          if (activeCall && ['calling', 'accepted'].includes(activeCall.status)) {
            // End the call
            try {
              const call = callService.endCall(activeCall.callId, userId);
              
              // Notify other participants
              activeCall.participants.forEach(participantId => {
                if (participantId !== userId) {
                  const participantSocketId = this.onlineUsers.get(participantId);
                  if (participantSocketId) {
                    this.io.to(participantSocketId).emit('call:ended', {
                      callId: call.callId,
                      endedBy: userId,
                      reason: 'disconnect',
                      duration: call.duration,
                    });
                  }
                }
              });
            } catch (error) {
              logger.error('Error ending call on disconnect:', error);
            }
          }
          
          try {
            await userService.updateOnlineStatus(userId, false);
            logger.info(`User ${userId} is now offline`);
          } catch (error) {
            logger.error('Update offline status error:', error);
          }
        }

        this.broadcastOnlineUsers();

        // Clean up socket references
        socket.removeAllListeners();
        
      } catch (error) {
        logger.error('Disconnect handler error:', error);
      }
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
