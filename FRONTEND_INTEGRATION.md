# Frontend Integration Guide

Complete guide for integrating your frontend with the new backend API.

## Table of Contents
1. [Configuration](#configuration)
2. [API Service Setup](#api-service-setup)
3. [Authentication](#authentication)
4. [User Management](#user-management)
5. [Messaging](#messaging)
6. [Socket.io Integration](#socketio-integration)
7. [Error Handling](#error-handling)
8. [Migration Examples](#migration-examples)

---

## Configuration

### Environment Variables

Create a `.env` file in your frontend project:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

Or for React (Create React App):
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

### Constants File

```javascript
// src/config/constants.js
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const ENDPOINTS = {
  // Auth
  SIGNUP: '/user/signup',
  SIGNIN: '/user/signin',
  GOOGLE_AUTH: '/user/googleAuth',
  DASHBOARD: '/user/dashboard',
  
  // User
  SEARCH_USERS: '/user/search',
  UPDATE_PROFILE: '/user/updateProfile',
  PROFILE_PICTURE: '/user/profilePicture',
  FETCH_PICTURE: '/user/fetchPicture',
  GET_PROFILE: '/user/getUpdateProfile',
  
  // Messages
  GET_MESSAGES: '/user/getMessage',
  DELETE_MESSAGE: '/user/deleteMessage',
  FORWARD_MESSAGE: '/user/messages/forward',
  MARK_READ: '/user/messages/read',
  UNREAD_COUNT: '/user/unreadCount',
  
  // Pin
  PIN_MESSAGE: '/user/pinMessage',
  UNPIN_MESSAGE: '/user/unpinMessage',
  GET_PINNED: '/user/getPinMessage',
};
```

---

## API Service Setup

### Base API Service

```javascript
// src/services/api.service.js
import { API_URL } from '../config/constants';

class ApiService {
  constructor() {
    this.baseURL = API_URL;
  }

  /**
   * Get auth token from storage
   */
  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  /**
   * Set auth token in storage
   */
  setToken(token, remember = true) {
    if (remember) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }
  }

  /**
   * Remove auth token
   */
  removeToken() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }

  /**
   * Get default headers
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.auth !== false),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Request failed',
          errors: data.errors || null,
        };
      }

      return data;
    } catch (error) {
      if (error.status === 401) {
        // Token expired or invalid
        this.removeToken();
        window.location.href = '/login';
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

export default new ApiService();
```

---

## Authentication

### Auth Service

```javascript
// src/services/auth.service.js
import apiService from './api.service';
import { ENDPOINTS } from '../config/constants';

class AuthService {
  /**
   * Register new user
   */
  async register(userData) {
    const response = await apiService.post(ENDPOINTS.SIGNUP, userData, { auth: false });
    
    if (response.success && response.data.token) {
      apiService.setToken(response.data.token);
    }
    
    return response.data;
  }

  /**
   * Login user
   */
  async login(email, password, remember = true) {
    const response = await apiService.post(
      ENDPOINTS.SIGNIN,
      { email, password },
      { auth: false }
    );
    
    if (response.success && response.data.token) {
      apiService.setToken(response.data.token, remember);
    }
    
    return response.data;
  }

  /**
   * Google OAuth login
   */
  async googleLogin(googleToken) {
    const response = await apiService.post(
      ENDPOINTS.GOOGLE_AUTH,
      { googleToken },
      { auth: false }
    );
    
    if (response.success && response.data.token) {
      apiService.setToken(response.data.token);
    }
    
    return response.data;
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await apiService.get(ENDPOINTS.DASHBOARD);
    return response.data.user;
  }

  /**
   * Logout
   */
  logout() {
    apiService.removeToken();
    // Disconnect socket if connected
    if (window.chatSocket) {
      window.chatSocket.disconnect();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!apiService.getToken();
  }
}

export default new AuthService();
```

### React Hook Example

```javascript
// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    if (!authService.isAuthenticated()) {
      setLoading(false);
      return;
    }

    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err.message);
      authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, remember) => {
    try {
      setError(null);
      const data = await authService.login(email, password, remember);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const data = await authService.register(userData);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## User Management

### User Service

```javascript
// src/services/user.service.js
import apiService from './api.service';
import { ENDPOINTS } from '../config/constants';

class UserService {
  /**
   * Search users
   */
  async searchUsers(query, page = 1, limit = 20) {
    const response = await apiService.get(ENDPOINTS.SEARCH_USERS, {
      q: query,
      page,
      limit,
    });
    return response.data;
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const response = await apiService.get(ENDPOINTS.GET_PROFILE, { userId });
    return response.data.user;
  }

  /**
   * Update profile
   */
  async updateProfile(userId, updates) {
    const response = await apiService.put(
      `${ENDPOINTS.UPDATE_PROFILE}/${userId}`,
      updates
    );
    return response.data.user;
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(userId, file) {
    // Convert file to base64
    const base64 = await this.fileToBase64(file);
    
    const response = await apiService.post(ENDPOINTS.PROFILE_PICTURE, {
      userId,
      base64,
    });
    
    return response.data.user;
  }

  /**
   * Get profile picture
   */
  async getProfilePicture(userId) {
    const response = await apiService.get(ENDPOINTS.FETCH_PICTURE, { userId });
    return response.data.url;
  }

  /**
   * Convert file to base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }
}

export default new UserService();
```

---

## Messaging

### Message Service

```javascript
// src/services/message.service.js
import apiService from './api.service';
import { ENDPOINTS } from '../config/constants';

class MessageService {
  /**
   * Get messages between users
   */
  async getMessages(userId, receiverId, page = 1, limit = 50) {
    const response = await apiService.get(ENDPOINTS.GET_MESSAGES, {
      userId,
      receiverId,
      page,
      limit,
    });
    return response.data;
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId) {
    const response = await apiService.delete(
      `${ENDPOINTS.DELETE_MESSAGE}/${messageId}`
    );
    return response;
  }

  /**
   * Forward message
   */
  async forwardMessage(messageId, senderId, receiverIds) {
    const response = await apiService.post(ENDPOINTS.FORWARD_MESSAGE, {
      messageId,
      senderId,
      receiverId: receiverIds,
    });
    return response.data.forwardedMessages;
  }

  /**
   * Pin message
   */
  async pinMessage(messageId, senderId, receiverId) {
    const response = await apiService.post(ENDPOINTS.PIN_MESSAGE, {
      messageId,
      senderId,
      receiverId,
    });
    return response.data.pinnedMessage;
  }

  /**
   * Unpin message
   */
  async unpinMessage(messageId, senderId, receiverId) {
    const response = await apiService.post(ENDPOINTS.UNPIN_MESSAGE, {
      messageId,
      senderId,
      receiverId,
    });
    return response;
  }

  /**
   * Get pinned messages
   */
  async getPinnedMessages(userId, receiverId) {
    const response = await apiService.get(ENDPOINTS.GET_PINNED, {
      userId,
      receiverId,
    });
    return response.data.pinnedMessages;
  }

  /**
   * Get unread count
   */
  async getUnreadCount() {
    const response = await apiService.get(ENDPOINTS.UNREAD_COUNT);
    return response.data.count;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(senderId) {
    const response = await apiService.post(ENDPOINTS.MARK_READ, { senderId });
    return response;
  }
}

export default new MessageService();
```

### React Hook for Messages

```javascript
// src/hooks/useMessages.js
import { useState, useEffect, useCallback } from 'react';
import messageService from '../services/message.service';

export const useMessages = (userId, receiverId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const loadMessages = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await messageService.getMessages(userId, receiverId, pageNum);
      
      if (pageNum === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }
      
      setPagination(data.pagination);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, receiverId]);

  useEffect(() => {
    if (userId && receiverId) {
      loadMessages(1);
    }
  }, [userId, receiverId, loadMessages]);

  const loadMore = () => {
    if (pagination && page < pagination.pages) {
      loadMessages(page + 1);
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const deleteMessage = async (messageId) => {
    try {
      await messageService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    pagination,
    loadMore,
    addMessage,
    deleteMessage,
    refresh: () => loadMessages(1),
  };
};
```

---

## Socket.io Integration

### Socket Service

```javascript
// src/services/socket.service.js
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/constants';
import apiService from './api.service';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this.listeners = new Map();
  }

  /**
   * Connect to socket server
   */
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

  /**
   * Setup default event listeners
   */
  setupDefaultListeners() {
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      
      // Notify server user is online
      this.socket.emit('user-online', this.userId);
      
      // Request user list
      const token = apiService.getToken();
      this.socket.emit('getUsers', { token });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.socket.emit('user-online', this.userId);
      const token = apiService.getToken();
      this.socket.emit('getUsers', { token });
    });
  }

  /**
   * Send message
   */
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

  /**
   * Start typing indicator
   */
  startTyping(receiverId) {
    this.socket.emit('typing', {
      senderId: this.userId,
      receiverId,
    });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(receiverId) {
    this.socket.emit('stopTyping', {
      senderId: this.userId,
      receiverId,
    });
  }

  /**
   * Listen for event
   */
  on(event, callback) {
    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
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

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      // Remove all custom listeners
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

  /**
   * Check if connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();
```

### React Hook for Socket

```javascript
// src/hooks/useSocket.js
import { useEffect, useCallback } from 'react';
import socketService from '../services/socket.service';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?._id) {
      socketService.connect(user._id);
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const sendMessage = useCallback((receiverId, content, replyTo) => {
    return socketService.sendMessage(receiverId, content, replyTo);
  }, []);

  const startTyping = useCallback((receiverId) => {
    socketService.startTyping(receiverId);
  }, []);

  const stopTyping = useCallback((receiverId) => {
    socketService.stopTyping(receiverId);
  }, []);

  const onMessage = useCallback((callback) => {
    socketService.on('receiveMessage', callback);
    return () => socketService.off('receiveMessage', callback);
  }, []);

  const onTyping = useCallback((callback) => {
    socketService.on('typing', callback);
    return () => socketService.off('typing', callback);
  }, []);

  const onStopTyping = useCallback((callback) => {
    socketService.on('stopTyping', callback);
    return () => socketService.off('stopTyping', callback);
  }, []);

  const onOnlineUsers = useCallback((callback) => {
    socketService.on('update-online-users', callback);
    return () => socketService.off('update-online-users', callback);
  }, []);

  return {
    sendMessage,
    startTyping,
    stopTyping,
    onMessage,
    onTyping,
    onStopTyping,
    onOnlineUsers,
    isConnected: socketService.isConnected(),
  };
};
```

---

## Error Handling

### Error Handler Utility

```javascript
// src/utils/errorHandler.js

/**
 * Format API error for display
 */
export const formatError = (error) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error.errors && Array.isArray(error.errors)) {
    return error.errors.map(e => e.message).join(', ');
  }

  return error.message || 'An error occurred';
};

/**
 * Handle API error with toast/notification
 */
export const handleApiError = (error, showToast) => {
  const message = formatError(error);
  
  if (showToast) {
    showToast(message, 'error');
  }

  console.error('API Error:', error);
  return message;
};

/**
 * Validation error helper
 */
export const getFieldError = (errors, fieldName) => {
  if (!errors || !Array.isArray(errors)) {
    return null;
  }

  const error = errors.find(e => e.field === fieldName);
  return error?.message || null;
};
```

---

## Migration Examples

### Before & After: Login Component

**BEFORE:**
```javascript
// Old login implementation
const handleLogin = async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch('http://localhost:3000/user/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (data.status) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } else {
      setError(data.message);
    }
  } catch (err) {
    setError('Login failed');
  }
};
```

**AFTER:**
```javascript
// New login implementation
import authService from '../services/auth.service';
import { handleApiError } from '../utils/errorHandler';

const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const data = await authService.login(email, password, rememberMe);
    // Token is automatically stored
    navigate('/dashboard');
  } catch (err) {
    const message = handleApiError(err, showToast);
    setError(message);
  } finally {
    setLoading(false);
  }
};
```

### Before & After: Fetch Messages

**BEFORE:**
```javascript
// Old fetch messages
const fetchMessages = async () => {
  try {
    const response = await fetch(
      `http://localhost:3000/user/getMessage?userId=${userId}&receiverId=${receiverId}`
    );
    const data = await response.json();
    
    if (data.status) {
      setMessages(data.messages);
    }
  } catch (err) {
    console.error(err);
  }
};
```

**AFTER:**
```javascript
// New fetch messages with pagination
import messageService from '../services/message.service';

const fetchMessages = async (page = 1) => {
  try {
    setLoading(true);
    const data = await messageService.getMessages(userId, receiverId, page);
    
    if (page === 1) {
      setMessages(data.messages);
    } else {
      setMessages(prev => [...prev, ...data.messages]);
    }
    
    setPagination(data.pagination);
  } catch (err) {
    handleApiError(err, showToast);
  } finally {
    setLoading(false);
  }
};
```

### Before & After: Socket Connection

**BEFORE:**
```javascript
// Old socket setup
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  socket.emit('user-online', userId);
});

socket.on('receiveMessage', (message) => {
  setMessages(prev => [...prev, message]);
});
```

**AFTER:**
```javascript
// New socket setup with hook
import { useSocket } from '../hooks/useSocket';

const ChatComponent = () => {
  const { sendMessage, onMessage, onOnlineUsers } = useSocket();
  
  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });
    
    return unsubscribe;
  }, [onMessage]);
  
  const handleSend = () => {
    sendMessage(receiverId, content);
  };
};
```

---

## Complete Example: Chat Component

```javascript
// src/components/Chat.jsx
import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';
import messageService from '../services/message.service';

const Chat = ({ currentUserId, receiverId }) => {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const { messages, loading, addMessage, deleteMessage } = useMessages(
    currentUserId,
    receiverId
  );
  
  const {
    sendMessage,
    startTyping,
    stopTyping,
    onMessage,
    onTyping,
    onStopTyping,
  } = useSocket();

  // Listen for incoming messages
  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (message.senderId === receiverId) {
        addMessage(message);
        // Mark as read
        messageService.markAsRead(receiverId);
      }
    });
    return unsubscribe;
  }, [onMessage, receiverId, addMessage]);

  // Listen for typing indicators
  useEffect(() => {
    const unsubscribeTyping = onTyping(({ senderId }) => {
      if (senderId === receiverId) {
        setIsTyping(true);
      }
    });

    const unsubscribeStopTyping = onStopTyping(({ senderId }) => {
      if (senderId === receiverId) {
        setIsTyping(false);
      }
    });

    return () => {
      unsubscribeTyping();
      unsubscribeStopTyping();
    };
  }, [onTyping, onStopTyping, receiverId]);

  // Handle typing
  const handleTyping = (e) => {
    setMessageText(e.target.value);
    startTyping(receiverId);
    
    // Stop typing after 1 second of inactivity
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      stopTyping(receiverId);
    }, 1000);
  };

  // Send message
  const handleSend = () => {
    if (!messageText.trim()) return;
    
    const messageId = sendMessage(receiverId, messageText);
    
    // Optimistically add to UI
    addMessage({
      messageId,
      senderId: currentUserId,
      receiverId,
      content: messageText,
      timestamp: new Date().toISOString(),
    });
    
    setMessageText('');
    stopTyping(receiverId);
  };

  // Delete message
  const handleDelete = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.messageId} className="message">
            <p>{msg.content}</p>
            <button onClick={() => handleDelete(msg.messageId)}>Delete</button>
          </div>
        ))}
        {isTyping && <div className="typing-indicator">Typing...</div>}
      </div>
      
      <div className="input-area">
        <input
          value={messageText}
          onChange={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
```

---

## Testing Checklist

- [ ] Login works with new API
- [ ] Registration works
- [ ] Google OAuth works
- [ ] Token is stored and sent correctly
- [ ] Protected routes require authentication
- [ ] Messages load with pagination
- [ ] Can send messages via Socket.io
- [ ] Typing indicators work
- [ ] Online status updates
- [ ] Can delete messages
- [ ] Can forward messages
- [ ] Can pin/unpin messages
- [ ] Profile picture upload works
- [ ] Profile update works
- [ ] Search users works
- [ ] Error handling displays properly
- [ ] Validation errors show on forms
- [ ] Rate limiting is handled gracefully

---

## Need Help?

- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoint details
- See [SOCKET_DOCUMENTATION.md](./SOCKET_DOCUMENTATION.md) for Socket.io events
- Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration steps
