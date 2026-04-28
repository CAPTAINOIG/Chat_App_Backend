# Socket.io Documentation

## Connection

Connect to the Socket.io server:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

---

## Client → Server Events

### 1. user-online
Notify server that user is online.

**Emit:**
```javascript
socket.emit('user-online', userId);
```

**Parameters:**
- `userId` (string): The user's ID

**Response:**
- Triggers `update-online-users` event to all clients

---

### 2. getUsers
Request list of all users.

**Emit:**
```javascript
socket.emit('getUsers', { token: 'your-jwt-token' });
```

**Parameters:**
- `token` (string): JWT authentication token

**Response:**
```javascript
socket.on('getUsers', (data) => {
  console.log(data);
  // {
  //   success: true,
  //   message: 'Users retrieved',
  //   users: [...]
  // }
});
```

---

### 3. typing
Notify that user is typing.

**Emit:**
```javascript
socket.emit('typing', {
  senderId: 'user-id-1',
  receiverId: 'user-id-2'
});
```

**Parameters:**
- `senderId` (string): ID of user who is typing
- `receiverId` (string): ID of user who should see typing indicator

**Response:**
- Receiver gets `typing` event

---

### 4. stopTyping
Notify that user stopped typing.

**Emit:**
```javascript
socket.emit('stopTyping', {
  senderId: 'user-id-1',
  receiverId: 'user-id-2'
});
```

**Parameters:**
- `senderId` (string): ID of user who stopped typing
- `receiverId` (string): ID of user who should see indicator removed

**Response:**
- Receiver gets `stopTyping` event

---

### 5. chat message
Send a chat message.

**Emit:**
```javascript
socket.emit('chat message', {
  messageId: '1234567890-abc123', // Optional, will be generated if not provided
  senderId: 'user-id-1',
  receiverId: 'user-id-2',
  content: 'Hello, how are you?',
  replyTo: 'message-id-to-reply-to' // Optional
});
```

**Parameters:**
- `messageId` (string, optional): Unique message ID
- `senderId` (string, required): Sender's user ID
- `receiverId` (string, required): Receiver's user ID
- `content` (string, required): Message content (max 5000 chars)
- `replyTo` (string, optional): ID of message being replied to

**Success Response:**
```javascript
socket.on('messageSent', (data) => {
  console.log(data);
  // {
  //   success: true,
  //   message: 'Message sent successfully',
  //   userMessage: {
  //     messageId: '1234567890-abc123',
  //     senderId: 'user-id-1',
  //     receiverId: 'user-id-2',
  //     content: 'Hello, how are you?',
  //     timestamp: '2026-04-28T10:30:00.000Z'
  //   }
  // }
});
```

**Error Response:**
```javascript
socket.on('messageError', (data) => {
  console.log(data);
  // {
  //   success: false,
  //   error: 'Error message'
  // }
});
```

---

## Server → Client Events

### 1. update-online-users
Broadcast list of online users.

**Listen:**
```javascript
socket.on('update-online-users', (onlineUserIds) => {
  console.log('Online users:', onlineUserIds);
  // ['user-id-1', 'user-id-2', 'user-id-3']
});
```

**Data:**
- Array of user IDs currently online

---

### 2. typing
Someone is typing.

**Listen:**
```javascript
socket.on('typing', ({ senderId, receiverId }) => {
  console.log(`${senderId} is typing to ${receiverId}`);
  // Show typing indicator in UI
});
```

**Data:**
- `senderId` (string): User who is typing
- `receiverId` (string): User receiving the message

---

### 3. stopTyping
Someone stopped typing.

**Listen:**
```javascript
socket.on('stopTyping', ({ senderId, receiverId }) => {
  console.log(`${senderId} stopped typing`);
  // Hide typing indicator in UI
});
```

**Data:**
- `senderId` (string): User who stopped typing
- `receiverId` (string): User receiving the message

---

### 4. receiveMessage
Receive a new message.

**Listen:**
```javascript
socket.on('receiveMessage', (message) => {
  console.log('New message:', message);
  // {
  //   messageId: '1234567890-abc123',
  //   senderId: 'user-id-1',
  //   receiverId: 'user-id-2',
  //   content: 'Hello!',
  //   replyTo: null,
  //   timestamp: '2026-04-28T10:30:00.000Z'
  // }
  
  // Add message to chat UI
  // Play notification sound
  // Update unread count
});
```

**Data:**
- `messageId` (string): Unique message ID
- `senderId` (string): Sender's user ID
- `receiverId` (string): Receiver's user ID
- `content` (string): Message content
- `replyTo` (string|null): ID of replied message
- `timestamp` (string): ISO timestamp

---

### 5. messageSent
Confirmation that message was sent.

**Listen:**
```javascript
socket.on('messageSent', (data) => {
  console.log('Message sent:', data);
  // Update UI to show message as sent
  // Add checkmark or sent indicator
});
```

---

### 6. messageError
Error sending message.

**Listen:**
```javascript
socket.on('messageError', (data) => {
  console.error('Message error:', data.error);
  // Show error to user
  // Retry sending or mark as failed
});
```

---

### 7. getUsers
Response with user list.

**Listen:**
```javascript
socket.on('getUsers', (data) => {
  if (data.success) {
    console.log('Users:', data.users);
    // Update user list in UI
  } else {
    console.error('Error getting users:', data.message);
  }
});
```

---

## Connection Events

### connect
Socket connected successfully.

**Listen:**
```javascript
socket.on('connect', () => {
  console.log('Connected to server');
  console.log('Socket ID:', socket.id);
  
  // Notify server that user is online
  socket.emit('user-online', userId);
  
  // Request user list
  socket.emit('getUsers', { token: authToken });
});
```

---

### disconnect
Socket disconnected.

**Listen:**
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Server disconnected, manually reconnect
    socket.connect();
  }
  // Otherwise, socket will automatically try to reconnect
});
```

---

### connect_error
Connection error.

**Listen:**
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Show connection error to user
  // Retry connection
});
```

---

### reconnect
Successfully reconnected.

**Listen:**
```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  
  // Re-authenticate and sync state
  socket.emit('user-online', userId);
  socket.emit('getUsers', { token: authToken });
});
```

---

## Complete Example

```javascript
import io from 'socket.io-client';

class ChatSocket {
  constructor(serverUrl, userId, token) {
    this.socket = io(serverUrl);
    this.userId = userId;
    this.token = token;
    this.setupListeners();
  }

  setupListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected');
      this.socket.emit('user-online', this.userId);
      this.socket.emit('getUsers', { token: this.token });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected');
    });

    // User events
    this.socket.on('update-online-users', (users) => {
      this.onOnlineUsersUpdate(users);
    });

    this.socket.on('getUsers', (data) => {
      if (data.success) {
        this.onUsersReceived(data.users);
      }
    });

    // Message events
    this.socket.on('receiveMessage', (message) => {
      this.onMessageReceived(message);
    });

    this.socket.on('messageSent', (data) => {
      this.onMessageSent(data);
    });

    this.socket.on('messageError', (data) => {
      this.onMessageError(data);
    });

    // Typing events
    this.socket.on('typing', ({ senderId }) => {
      this.onUserTyping(senderId);
    });

    this.socket.on('stopTyping', ({ senderId }) => {
      this.onUserStoppedTyping(senderId);
    });
  }

  sendMessage(receiverId, content, replyTo = null) {
    this.socket.emit('chat message', {
      senderId: this.userId,
      receiverId,
      content,
      replyTo
    });
  }

  startTyping(receiverId) {
    this.socket.emit('typing', {
      senderId: this.userId,
      receiverId
    });
  }

  stopTyping(receiverId) {
    this.socket.emit('stopTyping', {
      senderId: this.userId,
      receiverId
    });
  }

  disconnect() {
    this.socket.disconnect();
  }

  // Callback methods (override these)
  onOnlineUsersUpdate(users) {}
  onUsersReceived(users) {}
  onMessageReceived(message) {}
  onMessageSent(data) {}
  onMessageError(data) {}
  onUserTyping(userId) {}
  onUserStoppedTyping(userId) {}
}

// Usage
const chat = new ChatSocket('http://localhost:3000', 'my-user-id', 'my-jwt-token');

chat.onMessageReceived = (message) => {
  console.log('New message:', message);
  // Update UI
};

chat.sendMessage('receiver-id', 'Hello!');
```

---

## Best Practices

1. **Authentication**: Always send JWT token when requesting user data
2. **Reconnection**: Handle reconnection and re-sync state
3. **Error Handling**: Listen for error events and handle gracefully
4. **Typing Indicators**: Debounce typing events (send after 500ms of typing)
5. **Message Delivery**: Store messages locally and sync when connection restored
6. **Online Status**: Update UI based on `update-online-users` events
7. **Cleanup**: Disconnect socket when component unmounts
8. **Rate Limiting**: Respect rate limits (30 messages per minute)

---

## Troubleshooting

### Connection Issues
- Check server is running
- Verify CORS settings
- Check firewall/network settings
- Ensure correct server URL

### Messages Not Received
- Verify both users are connected
- Check receiver is online
- Verify user IDs are correct
- Check server logs for errors

### Typing Indicators Not Working
- Ensure both users are online
- Verify user IDs match
- Check socket connection status

### Authentication Errors
- Verify JWT token is valid
- Check token hasn't expired
- Ensure token is sent with requests
