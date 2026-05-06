/**
 * Enhanced Socket.io Service for Frontend
 * Copy this file to your frontend project: src/services/socket.service.js
 * 
 * Install socket.io-client first:
 * npm install socket.io-client
 */

import io from 'socket.io-client';
import apiService from './api.service';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.listeners = new Map();
    this.messageCallbacks = new Map(); // For message delivery tracking
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.typingTimeout = null;
    this.connectionPromise = null;
  }

  async connect(userId) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Prevent multiple connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.userId = userId;
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000, // Connection timeout
        forceNew: true, // Force new connection
      });

      this.setupDefaultListeners();
      
      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });
    });

    return this.connectionPromise;
  }

  setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.connectionPromise = null;
      
      // Emit user online with retry mechanism
      this.emitUserOnline();
      
      const token = apiService.getToken();
      if (token) {
        this.socket.emit('getUsers', { token });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.connectionPromise = null;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      this.emitUserOnline();
      
      const token = apiService.getToken();
      if (token) {
        this.socket.emit('getUsers', { token });
      }
    });

    // Handle message delivery confirmations
    this.socket.on('messageSent', (data) => {
      const callback = this.messageCallbacks.get(data.messageData?.messageId);
      if (callback) {
        callback({ success: true, data: data.messageData });
        this.messageCallbacks.delete(data.messageData.messageId);
      }
    });

    this.socket.on('messageError', (error) => {
      const callback = this.messageCallbacks.get(error.messageId);
      if (callback) {
        callback({ success: false, error: error.error });
        this.messageCallbacks.delete(error.messageId);
      }
    });

    this.socket.on('messageDelivered', (data) => {
      // Emit custom event for message delivery status
      this.emit('messageStatusUpdate', {
        messageId: data.messageId,
        status: 'delivered'
      });
    });

    this.socket.on('messageRead', (data) => {
      // Emit custom event for message read status
      this.emit('messageStatusUpdate', {
        messageId: data.messageId,
        status: 'read'
      });
    });

    // Auto-acknowledge received messages
    this.socket.on('receiveMessage', (message) => {
      // Send acknowledgment
      this.socket.emit('messageReceived', { messageId: message.messageId });
    });

    // Handle message deletion
    this.socket.on('messageDeleted', (data) => {
      this.emit('messageDeleted', data);
    });

    this.socket.on('messageDeleteConfirmed', (data) => {
      this.emit('messageDeleteConfirmed', data);
    });

    this.socket.on('messageDeleteError', (error) => {
      this.emit('messageDeleteError', error);
    });

    this.socket.on('userOnlineConfirmed', (data) => {
      console.log('✅ User online status confirmed:', data);
    });
  }

  emitUserOnline() {
    if (this.socket?.connected && this.userId) {
      this.socket.emit('user-online', this.userId);
    }
  }

  async sendMessage(receiverId, content, replyTo = null) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    if (!content?.trim()) {
      throw new Error('Message content cannot be empty');
    }

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      // Set timeout for message sending
      const timeout = setTimeout(() => {
        this.messageCallbacks.delete(messageId);
        reject(new Error('Message send timeout'));
      }, 10000); // 10 second timeout

      // Store callback for delivery confirmation
      this.messageCallbacks.set(messageId, (result) => {
        clearTimeout(timeout);
        if (result.success) {
          resolve({ messageId, data: result.data });
        } else {
          reject(new Error(result.error));
        }
      });

      this.socket.emit('chat message', {
        messageId,
        senderId: this.userId,
        receiverId,
        content: content.trim(),
        replyTo,
      });
    });
  }

  startTyping(receiverId) {
    if (!this.socket?.connected) return;

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.socket.emit('typing', {
      senderId: this.userId,
      receiverId,
    });

    // Auto-stop typing after 3 seconds
    this.typingTimeout = setTimeout(() => {
      this.stopTyping(receiverId);
    }, 3000);
  }

  stopTyping(receiverId) {
    if (!this.socket?.connected) return;

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    this.socket.emit('stopTyping', {
      senderId: this.userId,
      receiverId,
    });
  }

  markMessageAsRead(messageId) {
    if (!this.socket?.connected) return;
    
    this.socket.emit('messageRead', { messageId });
  }

  async deleteMessage(messageId) {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Delete message timeout'));
      }, 5000);

      // Listen for confirmation
      const handleConfirm = (data) => {
        if (data.messageId === messageId) {
          clearTimeout(timeout);
          this.socket.off('messageDeleteConfirmed', handleConfirm);
          this.socket.off('messageDeleteError', handleError);
          resolve(data);
        }
      };

      const handleError = (error) => {
        if (error.messageId === messageId) {
          clearTimeout(timeout);
          this.socket.off('messageDeleteConfirmed', handleConfirm);
          this.socket.off('messageDeleteError', handleError);
          reject(new Error(error.error));
        }
      };

      this.socket.on('messageDeleteConfirmed', handleConfirm);
      this.socket.on('messageDeleteError', handleError);

      // Emit delete request
      this.socket.emit('deleteMessage', {
        messageId,
        userId: this.userId
      });
    });
  }

  // Enhanced event handling
  on(event, callback) {
    if (!this.socket) return;

    this.socket.on(event, callback);
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit custom events
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }

  // Get connection status
  isConnected() {
    return this.socket?.connected || false;
  }

  // Get connection health
  getConnectionHealth() {
    return {
      connected: this.isConnected(),
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts,
      userId: this.userId,
    };
  }

  // Force reconnection
  async forceReconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    if (this.userId) {
      return this.connect(this.userId);
    }
  }

  disconnect() {
    // Clear all timeouts
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    // Clear message callbacks
    this.messageCallbacks.clear();

    if (this.socket) {
      // Remove all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();

      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionPromise = null;
    this.userId = null;
    this.reconnectAttempts = 0;
  }
}

export default new SocketService();
