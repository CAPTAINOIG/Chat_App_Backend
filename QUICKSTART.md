# Quick Start Guide

Get your chat backend up and running in 5 minutes!

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
nano .env  # or use your preferred editor
```

**Required variables:**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A random secret key (generate with: `openssl rand -base64 32`)
- `CLOUDINARY_*` - Your Cloudinary credentials
- `EMAIL_*` - Your email service credentials
- `GOOGLE_CLIENT_ID` - Your Google OAuth client ID (optional)
- `FRONTEND_URL` - Your frontend application URL

### 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
🚀 Server running on http://localhost:3000
📡 Socket.io ready for connections
```

## Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-04-28T10:30:00.000Z",
  "environment": "development"
}
```

### Register a User

```bash
curl -X POST http://localhost:3000/api/user/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "number": "1234567890"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/user/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Dashboard (Protected)

```bash
# Replace <TOKEN> with the token from login response
curl http://localhost:3000/api/user/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

## Test Socket.io

Create a simple HTML file to test Socket.io:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Socket.io Test</title>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
</head>
<body>
  <h1>Socket.io Test</h1>
  <div id="status">Connecting...</div>
  <div id="messages"></div>

  <script>
    const socket = io('http://localhost:3000');
    
    socket.on('connect', () => {
      document.getElementById('status').textContent = 'Connected!';
      console.log('Connected:', socket.id);
      
      // Test: Get users (replace with your token)
      socket.emit('getUsers', { token: 'YOUR_JWT_TOKEN' });
    });
    
    socket.on('getUsers', (data) => {
      console.log('Users:', data);
      document.getElementById('messages').innerHTML = 
        '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    });
    
    socket.on('disconnect', () => {
      document.getElementById('status').textContent = 'Disconnected';
    });
  </script>
</body>
</html>
```

## Common Issues

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change PORT in .env
```

### MongoDB Connection Error

- Check your MongoDB URI is correct
- Ensure MongoDB is running (if local)
- Check network/firewall settings
- Verify IP whitelist (if using Atlas)

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors

- Update `FRONTEND_URL` in .env
- Ensure frontend URL matches exactly (including protocol and port)

## Next Steps

1. **Read the Documentation**
   - [README.md](./README.md) - Full setup guide
   - [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
   - [SOCKET_DOCUMENTATION.md](./SOCKET_DOCUMENTATION.md) - Socket.io events

2. **Secure Your Application**
   - Read [SECURITY.md](./SECURITY.md)
   - Change all default credentials
   - Generate strong JWT secret
   - Configure CORS properly

3. **Integrate with Frontend**
   - Update API base URL to `http://localhost:3000/api`
   - Use Authorization header for protected routes
   - Handle new response format (`success`, `data`)

4. **Deploy to Production**
   - Set `NODE_ENV=production`
   - Use HTTPS
   - Configure proper CORS
   - Set up monitoring
   - Regular backups

## Development Workflow

```bash
# Start development server
npm run dev

# In another terminal, watch logs
tail -f logs/combined.log

# Run tests (when implemented)
npm test

# Lint code (when configured)
npm run lint
```

## Useful Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# List installed packages
npm list --depth=0

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Environment Setup Checklist

- [ ] Node.js installed
- [ ] MongoDB running/accessible
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] JWT_SECRET generated
- [ ] Cloudinary account set up
- [ ] Email service configured
- [ ] Server starts without errors
- [ ] Health check endpoint works
- [ ] Can register a user
- [ ] Can login
- [ ] Socket.io connects

## Getting Help

- Check [README.md](./README.md) for detailed setup
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
- See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) if upgrading
- Check logs in `logs/` directory
- Open an issue on GitHub

## Production Checklist

Before deploying to production:

- [ ] All environment variables set correctly
- [ ] `NODE_ENV=production`
- [ ] Strong JWT secret (not the default)
- [ ] HTTPS enabled
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Logs properly managed
- [ ] Security headers verified
- [ ] Dependencies updated
- [ ] Tested thoroughly

## Support

Need help? Check:
- Documentation files in this directory
- Server logs in `logs/` directory
- MongoDB logs
- Browser console (for frontend issues)

Happy coding! 🚀
