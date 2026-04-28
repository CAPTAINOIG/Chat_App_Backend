# Frontend Integration Examples

This folder contains ready-to-use service files for your frontend application.

## Quick Setup

### 1. Copy Files to Your Frontend Project

```bash
# Copy all service files
cp frontend-examples/*.js your-frontend-project/src/services/

# Or copy individually
cp frontend-examples/api.service.js your-frontend-project/src/services/
cp frontend-examples/auth.service.js your-frontend-project/src/services/
cp frontend-examples/socket.service.js your-frontend-project/src/services/
```

### 2. Install Dependencies

```bash
cd your-frontend-project
npm install socket.io-client
```

### 3. Configure Environment Variables

Create `.env` file in your frontend project:

```env
# For Vite
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000

# For Create React App
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=http://localhost:3000
```

### 4. Update Imports

If using Create React App, update the environment variable access:

```javascript
// Change from:
const API_URL = import.meta.env.VITE_API_URL;

// To:
const API_URL = process.env.REACT_APP_API_URL;
```

## Files Included

### api.service.js
Base API service with:
- Token management
- HTTP methods (GET, POST, PUT, DELETE)
- Automatic authentication headers
- Error handling
- Token refresh on 401

### auth.service.js
Authentication service with:
- Register
- Login
- Google OAuth
- Get current user
- Logout
- Check authentication status

### socket.service.js
Socket.io service with:
- Connection management
- Send messages
- Typing indicators
- Event listeners
- Auto-reconnection
- Cleanup

## Usage Examples

### Login

```javascript
import authService from './services/auth.service';

const handleLogin = async (email, password) => {
  try {
    const data = await authService.login(email, password, true);
    console.log('Logged in:', data.user);
    // Navigate to dashboard
  } catch (error) {
    console.error('Login failed:', error.message);
  }
};
```

### Send Message

```javascript
import socketService from './services/socket.service';

// Connect socket
socketService.connect(userId);

// Send message
const messageId = socketService.sendMessage(receiverId, 'Hello!');

// Listen for messages
socketService.on('receiveMessage', (message) => {
  console.log('New message:', message);
});
```

### Fetch Data

```javascript
import apiService from './services/api.service';

const fetchMessages = async (userId, receiverId, page = 1) => {
  try {
    const response = await apiService.get('/user/getMessage', {
      userId,
      receiverId,
      page,
      limit: 50
    });
    
    console.log('Messages:', response.data.messages);
    console.log('Pagination:', response.data.pagination);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
};
```

## React Hooks (Optional)

For React projects, you can create custom hooks:

### useAuth Hook

```javascript
// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, remember) => {
    const data = await authService.login(email, password, remember);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### useSocket Hook

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

  const onMessage = useCallback((callback) => {
    socketService.on('receiveMessage', callback);
    return () => socketService.off('receiveMessage', callback);
  }, []);

  return {
    sendMessage,
    onMessage,
    isConnected: socketService.isConnected(),
  };
};
```

## Complete Component Example

```javascript
// src/components/Chat.jsx
import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

const Chat = ({ receiverId }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const { user } = useAuth();
  const { sendMessage, onMessage } = useSocket();

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (message.senderId === receiverId) {
        setMessages(prev => [...prev, message]);
      }
    });

    return unsubscribe;
  }, [onMessage, receiverId]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    
    const messageId = sendMessage(receiverId, messageText);
    
    setMessages(prev => [...prev, {
      messageId,
      senderId: user._id,
      receiverId,
      content: messageText,
      timestamp: new Date().toISOString(),
    }]);
    
    setMessageText('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.messageId}>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      
      <input
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

export default Chat;
```

## Testing

### Test API Connection

```javascript
import apiService from './services/api.service';

// Test health endpoint
fetch('http://localhost:3000/health')
  .then(res => res.json())
  .then(data => console.log('Server status:', data));

// Test login
authService.login('test@example.com', 'password123')
  .then(data => console.log('Login success:', data))
  .catch(err => console.error('Login failed:', err));
```

### Test Socket Connection

```javascript
import socketService from './services/socket.service';

socketService.connect('your-user-id');

socketService.on('connect', () => {
  console.log('Socket connected!');
});

socketService.on('update-online-users', (users) => {
  console.log('Online users:', users);
});
```

## Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL exactly
- Include protocol and port: `http://localhost:5173`

### 401 Unauthorized
- Check token is being sent in Authorization header
- Verify token hasn't expired
- Check token format: `Bearer <token>`

### Socket Not Connecting
- Verify `SOCKET_URL` is correct
- Check backend server is running
- Check browser console for errors
- Verify firewall/network settings

### Messages Not Received
- Ensure both users are connected
- Check user IDs are correct
- Verify socket event names match backend
- Check browser console for errors

## Next Steps

1. Copy the service files to your frontend project
2. Install socket.io-client
3. Configure environment variables
4. Update your components to use the new services
5. Test authentication flow
6. Test messaging functionality
7. Deploy and monitor

## Documentation

For more details, see:
- [FRONTEND_INTEGRATION.md](../FRONTEND_INTEGRATION.md) - Complete integration guide
- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - API reference
- [SOCKET_DOCUMENTATION.md](../SOCKET_DOCUMENTATION.md) - Socket.io events
- [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) - Migration instructions

## Support

If you encounter issues:
1. Check the documentation files
2. Review browser console for errors
3. Check network tab in DevTools
4. Verify backend is running and accessible
5. Check backend logs in `logs/` directory
