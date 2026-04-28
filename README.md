# Chat Application Backend

A real-time chat application backend built with Node.js, Express, Socket.io, and MongoDB.

## Features

- ✅ Real-time messaging with Socket.io
- ✅ User authentication (Email/Password & Google OAuth)
- ✅ JWT-based authorization
- ✅ Message forwarding and pinning
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Profile picture upload (Cloudinary)
- ✅ Message read receipts
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling
- ✅ Logging system
- ✅ Security best practices

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Authentication**: JWT, Google OAuth
- **File Upload**: Cloudinary
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston

## Project Structure

```
backend_lets_chat/
├── config/              # Configuration files
├── connection/          # Database connection
├── controllers/         # Route controllers
├── middleware/          # Custom middleware
├── models/             # Mongoose models
├── routes/             # API routes
├── services/           # Business logic
├── socket/             # Socket.io handlers
├── utils/              # Utility functions
├── validators/         # Input validation schemas
├── logs/               # Application logs
├── app.js              # Main application file
├── .env.example        # Environment variables template
└── package.json        # Dependencies
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend_lets_chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your configuration:
   - MongoDB connection string
   - JWT secret
   - Cloudinary credentials
   - Email credentials
   - Google OAuth client ID
   - Frontend URL

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CLOUDINARY_*`: Cloudinary configuration
- `EMAIL_*`: Email service configuration
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `FRONTEND_URL`: Your frontend application URL

## API Endpoints

### Authentication
- `POST /api/user/signup` - Register new user
- `POST /api/user/signin` - Login user
- `POST /api/user/googleAuth` - Google OAuth login

### User Management
- `GET /api/user/dashboard` - Get user profile (protected)
- `GET /api/user/search` - Search users (protected)
- `PUT /api/user/updateProfile/:userId` - Update profile (protected)
- `POST /api/user/profilePicture` - Upload profile picture (protected)

### Messages
- `GET /api/user/getMessage` - Fetch messages (protected)
- `GET /api/user/unreadCount` - Get unread count (protected)
- `POST /api/user/messages/read` - Mark as read (protected)
- `POST /api/user/messages/forward` - Forward message (protected)
- `DELETE /api/user/deleteMessage/:messageId` - Delete message (protected)

### Pinned Messages
- `GET /api/user/getPinMessage` - Get pinned messages (protected)
- `POST /api/user/pinMessage` - Pin message (protected)
- `POST /api/user/unpinMessage` - Unpin message (protected)

## Socket.io Events

### Client → Server
- `user-online` - User comes online
- `typing` - User is typing
- `stopTyping` - User stopped typing
- `chat message` - Send message
- `getUsers` - Request user list

### Server → Client
- `update-online-users` - Online users list
- `typing` - Someone is typing
- `stopTyping` - Someone stopped typing
- `receiveMessage` - New message received
- `messageSent` - Message sent confirmation
- `messageError` - Message error
- `getUsers` - User list response

## Security Features

1. **Helmet**: Security headers
2. **CORS**: Configured for specific origin
3. **Rate Limiting**: Prevents abuse
4. **Input Validation**: Joi schemas
5. **JWT Authentication**: Secure token-based auth
6. **Password Hashing**: bcrypt with salt rounds
7. **Error Handling**: Centralized error management
8. **Logging**: Winston for audit trails

## Performance Optimizations

1. **Database Indexing**: Optimized queries
2. **Pagination**: All list endpoints support pagination
3. **Connection Pooling**: MongoDB connection pool
4. **Efficient Queries**: Compound indexes
5. **Soft Deletes**: Messages marked as deleted, not removed

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests (when implemented)
npm test

# Lint code (when configured)
npm run lint
```

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use a process manager (PM2 recommended)
3. Set up reverse proxy (Nginx)
4. Enable HTTPS
5. Configure proper CORS origins
6. Set up monitoring and logging
7. Regular database backups

### PM2 Example
```bash
npm install -g pm2
pm2 start app.js --name chat-backend
pm2 save
pm2 startup
```

## Logging

Logs are stored in the `logs/` directory:
- `error.log` - Error logs only
- `combined.log` - All logs

In development, logs also appear in console with colors.

## Error Handling

All errors are handled centrally and return consistent JSON responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Optional validation errors
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
