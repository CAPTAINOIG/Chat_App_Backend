/**
 * Socket.io Service for Frontend
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
  }

  connect(userId) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.userId = userId;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupDefaultListeners();
    return this.socket;
  }

  setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      
      this.socket.emit('user-online', this.userId);
      
      const token = apiService.getToken();
      this.socket.emit('getUsers', { token });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      this.socket.emit('user-online', this.userId);
      const token = apiService.getToken();
      this.socket.emit('getUsers', { token });
    });
  }

  sendMessage(receiverId, content, replyTo = null) {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.socket.emit('chat message', {
      messageId,
      senderId: this.userId,
      receiverId,
      content,
      replyTo,
    });

    return messageId;
  }

  startTyping(receiverId) {
    this.socket.emit('typing', {
      senderId: this.userId,
      receiverId,
    });
  }

  stopTyping(receiverId) {
    this.socket.emit('stopTyping', {
      senderId: this.userId,
      receiverId,
    });
  }

  on(event, callback) {
    this.socket.on(event, callback);
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    this.socket.off(event, callback);
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();

      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
