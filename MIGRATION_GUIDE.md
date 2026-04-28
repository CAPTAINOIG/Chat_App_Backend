# Migration Guide

This guide helps you migrate from the old backend structure to the new improved version.

## Breaking Changes

### 1. Environment Variables

**Old:**
```env
URI=mongodb://...
SECRET=...
PASS=...
API_KEY=...
API_SECRET=...
USERMAIL=...
```

**New:**
```env
MONGODB_URI=mongodb://...
JWT_SECRET=...
EMAIL_PASSWORD=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_CLOUD_NAME=...
EMAIL_USER=...
GOOGLE_CLIENT_ID=...
FRONTEND_URL=...
```

**Action Required:**
1. Copy `.env.example` to `.env`
2. Update all environment variable names
3. Add new required variables

---

### 2. API Routes

All routes now have `/api` prefix.

**Old:**
```
POST /user/signup
GET /user/dashboard
```

**New:**
```
POST /api/user/signup
GET /api/user/dashboard
```

**Action Required:**
Update all frontend API calls to include `/api` prefix.

---

### 3. Response Format

Responses are now standardized.

**Old:**
```json
{
  "status": true,
  "message": "Success",
  "result": { ... }
}
```

**New:**
```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

**Action Required:**
Update frontend to use `success` instead of `status` and `data` instead of `result`.

---

### 4. Authentication

Dashboard endpoint now requires authentication.

**Old:**
```javascript
// Token in body
fetch('/user/dashboard', {
  method: 'POST',
  body: JSON.stringify({ token })
})
```

**New:**
```javascript
// Token in header
fetch('/api/user/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**Action Required:**
Update all authenticated requests to use Authorization header.

---

### 5. User Model Changes

**Changes:**
- Duplicate `username` field removed
- `password` now properly required only for non-Google users
- Added `isOnline` and `lastSeen` fields
- Added `timestamps` (createdAt, updatedAt)

**Action Required:**
- No action needed for existing users
- New fields will be added automatically

---

### 6. Message Model Changes

**Changes:**
- `messageId` now required and unique
- IDs changed from String to ObjectId references
- Added `isRead`, `readAt`, `isDeleted`, `deletedAt` fields
- Added indexes for performance

**Action Required:**
- Existing messages will work but won't have new fields
- Consider running a migration script to add `messageId` to old messages

---

### 7. Password Validation

**Old:**
```javascript
user.validatePassword(password, (err, same) => {
  if (same) {
    // Success
  }
});
```

**New:**
```javascript
const isValid = await user.validatePassword(password);
if (isValid) {
  // Success
}
```

**Action Required:**
- No action needed (handled internally)

---

## New Features

### 1. Pagination

All list endpoints now support pagination:

```javascript
// Get messages with pagination
GET /api/user/getMessage?userId=xxx&receiverId=yyy&page=1&limit=50

// Response includes pagination info
{
  "success": true,
  "data": {
    "messages": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3
    }
  }
}
```

---

### 2. Search Users

New endpoint to search users:

```javascript
GET /api/user/search?q=john&page=1&limit=20
```

---

### 3. Read Receipts

New endpoints for message read status:

```javascript
// Get unread count
GET /api/user/unreadCount

// Mark messages as read
POST /api/user/messages/read
Body: { "senderId": "user-id" }
```

---

### 4. Rate Limiting

API now has rate limiting:
- General: 100 requests per 15 minutes
- Auth: 5 requests per 15 minutes
- Messages: 30 per minute

---

### 5. Input Validation

All inputs are now validated. Invalid requests return:

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

---

## Migration Steps

### Step 1: Backup

```bash
# Backup your database
mongodump --uri="your-mongodb-uri" --out=./backup

# Backup your .env file
cp .env .env.backup
```

---

### Step 2: Install New Dependencies

```bash
npm install
```

New dependencies:
- express-rate-limit
- express-validator
- helmet
- joi
- morgan
- winston
- redis (optional)

---

### Step 3: Update Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

---

### Step 4: Update Frontend

1. **Update API base URL:**
   ```javascript
   // Old
   const API_URL = 'http://localhost:3000';
   
   // New
   const API_URL = 'http://localhost:3000/api';
   ```

2. **Update authentication:**
   ```javascript
   // Old
   fetch(`${API_URL}/user/dashboard`, {
     method: 'POST',
     body: JSON.stringify({ token })
   })
   
   // New
   fetch(`${API_URL}/user/dashboard`, {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   })
   ```

3. **Update response handling:**
   ```javascript
   // Old
   if (response.status) {
     const data = response.result;
   }
   
   // New
   if (response.success) {
     const data = response.data;
   }
   ```

4. **Handle pagination:**
   ```javascript
   const response = await fetch(
     `${API_URL}/user/getMessage?userId=${userId}&receiverId=${receiverId}&page=1&limit=50`
   );
   const { messages, pagination } = response.data;
   ```

---

### Step 5: Test

1. **Test authentication:**
   - Register new user
   - Login
   - Google OAuth

2. **Test messaging:**
   - Send message
   - Receive message
   - Delete message
   - Forward message

3. **Test new features:**
   - Search users
   - Pagination
   - Read receipts
   - Profile updates

---

### Step 6: Deploy

1. **Update environment variables on server**
2. **Install dependencies:** `npm install`
3. **Restart server:** `pm2 restart chat-backend`
4. **Monitor logs:** `pm2 logs chat-backend`

---

## Rollback Plan

If you need to rollback:

1. **Restore code:**
   ```bash
   git checkout <previous-commit>
   npm install
   ```

2. **Restore database:**
   ```bash
   mongorestore --uri="your-mongodb-uri" ./backup
   ```

3. **Restore .env:**
   ```bash
   cp .env.backup .env
   ```

4. **Restart server:**
   ```bash
   pm2 restart chat-backend
   ```

---

## Optional: Data Migration Script

If you want to migrate existing messages to have `messageId`:

```javascript
// scripts/migrate-messages.js
const mongoose = require('mongoose');
const Message = require('./models/message.model');

async function migrateMessages() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const messages = await Message.find({ messageId: { $exists: false } });
  
  for (const message of messages) {
    message.messageId = `${message._id}-migrated`;
    await message.save();
  }
  
  console.log(`Migrated ${messages.length} messages`);
  process.exit(0);
}

migrateMessages();
```

Run with:
```bash
node scripts/migrate-messages.js
```

---

## Support

If you encounter issues during migration:

1. Check the logs: `logs/error.log`
2. Review the API documentation: `API_DOCUMENTATION.md`
3. Check Socket.io events: `SOCKET_DOCUMENTATION.md`
4. Review security guidelines: `SECURITY.md`

---

## Timeline

Recommended migration timeline:

- **Week 1**: Set up new environment, test locally
- **Week 2**: Update frontend, test integration
- **Week 3**: Deploy to staging, full testing
- **Week 4**: Deploy to production, monitor

---

## Checklist

- [ ] Backup database
- [ ] Backup .env file
- [ ] Install new dependencies
- [ ] Update environment variables
- [ ] Update frontend API calls
- [ ] Update authentication headers
- [ ] Update response handling
- [ ] Test all features
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Full testing on staging
- [ ] Deploy to production
- [ ] Monitor logs and errors
- [ ] Update team documentation
