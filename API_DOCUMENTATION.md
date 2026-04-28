# API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## Public Endpoints

### 1. Register User
**POST** `/user/signup`

Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "number": "1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "profilePicture": "https://...",
      "aboutMe": "Hey there, I am using chat app",
      "profileName": "Anonymous"
    }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### 2. Login User
**POST** `/user/signin`

Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { /* user object */ }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### 3. Google OAuth Login
**POST** `/user/googleAuth`

Authenticate using Google OAuth token.

**Request Body:**
```json
{
  "googleToken": "google-oauth-token-here"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { /* user object */ }
  }
}
```

**Rate Limit:** 5 requests per 15 minutes

---

## Protected Endpoints

### User Management

#### 4. Get Dashboard
**GET** `/user/dashboard`

Get current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Dashboard data retrieved",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "profilePicture": "https://...",
      "aboutMe": "Hey there, I am using chat app",
      "profileName": "John Doe",
      "isOnline": true,
      "lastSeen": "2026-04-28T10:30:00.000Z"
    }
  }
}
```

---

#### 5. Search Users
**GET** `/user/search?q=john&page=1&limit=20`

Search for users by username or email.

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "message": "Search results retrieved",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "username": "johndoe",
        "email": "john@example.com",
        "profilePicture": "https://...",
        "isOnline": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

---

#### 6. Update Profile
**PUT** `/user/updateProfile/:userId`

Update user profile information.

**Request Body:**
```json
{
  "profileName": "John Doe",
  "aboutMe": "Software Developer"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { /* updated user object */ }
  }
}
```

---

#### 7. Upload Profile Picture
**POST** `/user/profilePicture`

Upload a new profile picture.

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "user": { /* user with new profile picture */ }
  }
}
```

---

#### 8. Get Profile Picture
**GET** `/user/fetchPicture?userId=507f1f77bcf86cd799439011`

Get user's profile picture URL.

**Response (200):**
```json
{
  "success": true,
  "message": "Profile picture retrieved",
  "data": {
    "url": "https://res.cloudinary.com/..."
  }
}
```

---

#### 9. Get User Profile
**GET** `/user/getUpdateProfile?userId=507f1f77bcf86cd799439011`

Get specific user's profile.

**Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "user": { /* user object */ }
  }
}
```

---

### Message Management

#### 10. Get Messages
**GET** `/user/getMessage?userId=xxx&receiverId=yyy&page=1&limit=50`

Fetch messages between two users.

**Query Parameters:**
- `userId` (required): Current user ID
- `receiverId` (required): Other user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Messages per page (default: 50)

**Response (200):**
```json
{
  "success": true,
  "message": "Messages retrieved",
  "data": {
    "messages": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "messageId": "1234567890-abc123",
        "senderId": { /* sender user object */ },
        "receiverId": { /* receiver user object */ },
        "content": "Hello!",
        "timestamp": "2026-04-28T10:30:00.000Z",
        "isRead": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "pages": 2
    }
  }
}
```

---

#### 11. Delete Message
**DELETE** `/user/deleteMessage/:messageId`

Delete a message (soft delete).

**Response (200):**
```json
{
  "success": true,
  "message": "Message deleted successfully",
  "data": null
}
```

---

#### 12. Forward Message
**POST** `/user/messages/forward`

Forward a message to multiple recipients.

**Request Body:**
```json
{
  "messageId": "507f1f77bcf86cd799439011",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Messages forwarded successfully",
  "data": {
    "forwardedMessages": [ /* array of forwarded messages */ ]
  }
}
```

---

#### 13. Get Unread Count
**GET** `/user/unreadCount`

Get count of unread messages for current user.

**Response (200):**
```json
{
  "success": true,
  "message": "Unread count retrieved",
  "data": {
    "count": 5
  }
}
```

---

#### 14. Mark Messages as Read
**POST** `/user/messages/read`

Mark all messages from a sender as read.

**Request Body:**
```json
{
  "senderId": "507f1f77bcf86cd799439011"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": null
}
```

---

### Pinned Messages

#### 15. Pin Message
**POST** `/user/pinMessage`

Pin a message in a conversation.

**Request Body:**
```json
{
  "messageId": "1234567890-abc123",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message pinned successfully",
  "data": {
    "pinnedMessage": { /* pinned message object */ }
  }
}
```

---

#### 16. Unpin Message
**POST** `/user/unpinMessage`

Unpin a message.

**Request Body:**
```json
{
  "messageId": "1234567890-abc123",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439012"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message unpinned successfully",
  "data": null
}
```

---

#### 17. Get Pinned Messages
**GET** `/user/getPinMessage?userId=xxx&receiverId=yyy`

Get all pinned messages in a conversation.

**Response (200):**
```json
{
  "success": true,
  "message": "Pinned messages retrieved",
  "data": {
    "pinnedMessages": [ /* array of pinned messages */ ]
  }
}
```

---

## Error Responses

All endpoints may return error responses in this format:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Invalid token"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "message": "email already exists"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Auth Endpoints** (`/signup`, `/signin`, `/googleAuth`): 5 requests per 15 minutes
- **Socket.io Messages**: 30 messages per minute

---

## Socket.io Events

See [Socket.io Documentation](./SOCKET_DOCUMENTATION.md) for real-time event details.
