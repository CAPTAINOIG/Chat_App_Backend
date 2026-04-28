# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-04-28

### 🚀 Major Refactor & Improvements

This is a complete overhaul of the backend with breaking changes. See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration instructions.

---

### ✨ Added

#### Security
- **Helmet.js** for security headers
- **Rate limiting** on all endpoints (configurable)
  - General API: 100 req/15min
  - Auth endpoints: 5 req/15min
  - Messages: 30 req/min
- **Input validation** using Joi schemas
- **JWT authentication middleware** for protected routes
- **CORS** properly configured for specific origins
- **Password hashing** improved with async/await
- **Error handling** centralized with no sensitive data exposure

#### Architecture
- **Service layer** for business logic separation
  - `auth.service.js` - Authentication logic
  - `user.service.js` - User management
  - `message.service.js` - Message operations
  - `email.service.js` - Email notifications
- **Middleware** organization
  - `auth.js` - JWT verification
  - `errorHandler.js` - Global error handling
  - `rateLimiter.js` - Rate limiting configs
- **Validators** for request validation
- **Utils** for common functions
  - `logger.js` - Winston logging
  - `responseHandler.js` - Standardized responses
  - `asyncHandler.js` - Async error wrapper
- **Socket handler** separated from main app
- **Config** centralized in `config/index.js`

#### Features
- **Pagination** on all list endpoints
- **Search users** by username or email
- **Read receipts** for messages
- **Unread message count** endpoint
- **Mark messages as read** functionality
- **Online/offline status** tracking
- **Last seen** timestamp
- **Soft delete** for messages
- **Profile picture** optimization (Cloudinary transformations)
- **Health check** endpoint (`/health`)

#### Database
- **Indexes** added for performance
  - User: email, googleId, isOnline
  - Message: messageId, senderId, receiverId, users, timestamp
  - Compound indexes for common queries
- **Timestamps** on all models (createdAt, updatedAt)
- **Connection pooling** configured
- **Graceful shutdown** handling

#### Logging
- **Winston logger** with file and console transports
- **Morgan** for HTTP request logging
- **Error logs** in `logs/error.log`
- **Combined logs** in `logs/combined.log`
- **Structured logging** with metadata

#### Documentation
- **README.md** - Complete setup guide
- **API_DOCUMENTATION.md** - Full API reference
- **SOCKET_DOCUMENTATION.md** - Socket.io events guide
- **SECURITY.md** - Security guidelines
- **MIGRATION_GUIDE.md** - Migration instructions
- **CHANGELOG.md** - This file
- **.env.example** - Environment template

#### Development
- **ESLint** configuration ready
- **Jest** test setup ready
- **Better error messages** in development
- **Hot reload** with nodemon

---

### 🔧 Changed

#### Breaking Changes
- **API routes** now prefixed with `/api`
  - Old: `/user/signup`
  - New: `/api/user/signup`
- **Response format** standardized
  - Old: `{ status, message, result }`
  - New: `{ success, message, data }`
- **Authentication** moved to headers
  - Old: Token in request body
  - New: `Authorization: Bearer <token>` header
- **Environment variables** renamed
  - `URI` → `MONGODB_URI`
  - `SECRET` → `JWT_SECRET`
  - `PASS` → `EMAIL_PASSWORD`
  - And more (see `.env.example`)

#### Models
- **User model**
  - Removed duplicate `username` field
  - Fixed `password` required logic
  - Added `isOnline`, `lastSeen` fields
  - Added timestamps
  - Improved validation
  - Added indexes
- **Message model**
  - Changed IDs to ObjectId references
  - Made `messageId` required and unique
  - Added `isRead`, `readAt` fields
  - Added `isDeleted`, `deletedAt` fields
  - Added indexes
  - Added timestamps
- **Conversation model**
  - Complete restructure
  - Now tracks participants and last message
  - Unread count per user

#### Controllers
- **Refactored** to use service layer
- **Async/await** instead of callbacks
- **Error handling** with asyncHandler wrapper
- **Standardized responses** using ResponseHandler
- **Removed unused variables**
- **Better validation**

#### Socket.io
- **Separated** into dedicated handler class
- **Better error handling**
- **Improved logging**
- **Cleaner event organization**
- **Authentication** on socket events
- **Online status** management improved

---

### 🐛 Fixed

- **Duplicate username field** in User model
- **Password validation** callback hell
- **Unused variables** throughout codebase
- **Inconsistent response formats**
- **Missing error handling** in many places
- **No input validation** on endpoints
- **CORS set to `*`** (now configurable)
- **Exposed credentials** in code (now in .env)
- **No rate limiting** (now implemented)
- **Poor error messages** (now descriptive)
- **Memory leaks** in socket connections
- **Database connection** not properly managed

---

### 🗑️ Removed

- **body-parser** (built into Express 4.16+)
- **Unused test files** (tes.js, Test2.js)
- **Commented code** in utils.js
- **Console.log statements** (replaced with logger)
- **Hardcoded values** (moved to config)
- **Inline socket logic** (moved to handler)
- **Callback-based code** (replaced with async/await)

---

### 📦 Dependencies

#### Added
- `express-rate-limit@^7.1.5` - Rate limiting
- `express-validator@^7.0.1` - Request validation
- `helmet@^7.1.0` - Security headers
- `joi@^17.12.0` - Schema validation
- `morgan@^1.10.0` - HTTP logging
- `winston@^3.11.0` - Application logging
- `redis@^4.6.12` - Caching (optional)
- `socket.io-redis@^6.1.1` - Socket.io scaling (optional)

#### Removed
- `body-parser` - No longer needed

#### Updated
- All dependencies to latest stable versions

---

### 🔒 Security Improvements

1. **Authentication**
   - JWT tokens with expiration
   - Secure password hashing
   - Google OAuth integration
   - Token verification middleware

2. **Input Validation**
   - All inputs validated with Joi
   - SQL injection prevention (Mongoose)
   - XSS protection
   - File upload validation

3. **Rate Limiting**
   - Prevents brute force attacks
   - Configurable limits
   - Different limits per endpoint type

4. **Headers**
   - Helmet.js security headers
   - CORS properly configured
   - Content Security Policy

5. **Error Handling**
   - No sensitive data in errors
   - Stack traces only in development
   - Proper HTTP status codes

6. **Logging**
   - All errors logged
   - Audit trail for security events
   - No sensitive data in logs

---

### 📈 Performance Improvements

1. **Database**
   - Indexes on frequently queried fields
   - Compound indexes for complex queries
   - Connection pooling
   - Query optimization

2. **API**
   - Pagination on all list endpoints
   - Efficient queries with select()
   - Reduced payload sizes
   - Caching ready (Redis)

3. **Socket.io**
   - Better connection management
   - Reduced event emissions
   - Efficient online user tracking
   - Scaling ready with Redis adapter

---

### 📝 Code Quality

1. **Structure**
   - Clear separation of concerns
   - Service layer for business logic
   - Reusable middleware
   - Modular architecture

2. **Consistency**
   - Standardized response format
   - Consistent error handling
   - Uniform naming conventions
   - Code style guidelines

3. **Maintainability**
   - Comprehensive documentation
   - Clear file organization
   - Reusable utilities
   - Easy to test structure

4. **Best Practices**
   - Async/await over callbacks
   - Promises over callbacks
   - Environment-based config
   - Graceful error handling

---

## [1.0.0] - Previous Version

### Initial Release
- Basic chat functionality
- User authentication
- Socket.io real-time messaging
- MongoDB integration
- Cloudinary image upload
- Email notifications

---

## Migration Notes

**From 1.0.0 to 2.0.0:**
- This is a major version with breaking changes
- See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions
- Backup your database before upgrading
- Update frontend to match new API format
- Update environment variables
- Test thoroughly before production deployment

---

## Future Roadmap

### Planned Features
- [ ] Message editing
- [ ] Message reactions (emoji)
- [ ] File attachments
- [ ] Voice messages
- [ ] Video calls
- [ ] Group chats
- [ ] Message encryption
- [ ] Push notifications
- [ ] User blocking
- [ ] Report system
- [ ] Admin dashboard
- [ ] Analytics
- [ ] Message search
- [ ] Archive conversations
- [ ] Export chat history

### Technical Improvements
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] CI/CD pipeline
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Redis caching
- [ ] Message queue (RabbitMQ/Kafka)
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] WebRTC integration
- [ ] Progressive Web App

---

## Support

For questions or issues:
- Check documentation in `/docs`
- Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- Open an issue on GitHub
- Contact support team

---

## Contributors

- Backend Team
- Security Team
- DevOps Team

---

## License

ISC
