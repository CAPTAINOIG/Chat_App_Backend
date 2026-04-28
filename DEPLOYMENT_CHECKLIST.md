# Deployment Checklist

Use this checklist to ensure your backend is properly configured and ready for deployment.

## 🔧 Pre-Deployment

### Environment Setup
- [ ] `.env` file created from `.env.example`
- [ ] All environment variables configured
- [ ] MongoDB URI updated (not using exposed credentials)
- [ ] JWT_SECRET changed to a strong random value
- [ ] Cloudinary credentials updated
- [ ] Email credentials configured
- [ ] Google OAuth client ID set (if using)
- [ ] FRONTEND_URL set to production URL
- [ ] NODE_ENV set to `production`

### Security
- [ ] All default credentials rotated
- [ ] JWT secret is strong (32+ characters, random)
- [ ] Database password is strong
- [ ] API keys are not exposed in code
- [ ] `.env` is in `.gitignore`
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled and configured
- [ ] Helmet security headers enabled

### Dependencies
- [ ] All dependencies installed: `npm install`
- [ ] No security vulnerabilities: `npm audit`
- [ ] Dependencies up to date: `npm update`
- [ ] Production dependencies only (no dev deps in production)

### Database
- [ ] MongoDB accessible from production server
- [ ] Database indexes created (automatic on first run)
- [ ] Database backups configured
- [ ] Connection string uses authentication
- [ ] IP whitelist configured (if using Atlas)

### Code
- [ ] All console.log removed or replaced with logger
- [ ] No commented-out code
- [ ] No TODO comments for critical features
- [ ] Error handling in place
- [ ] Validation on all endpoints

---

## 🧪 Testing

### Local Testing
- [ ] Server starts without errors: `npm start`
- [ ] Health check works: `curl http://localhost:3000/health`
- [ ] Can register a user
- [ ] Can login
- [ ] Can access protected routes with token
- [ ] Socket.io connects successfully
- [ ] Can send and receive messages
- [ ] Typing indicators work
- [ ] Online status updates
- [ ] Profile picture upload works
- [ ] All CRUD operations work

### API Testing
- [ ] Test all endpoints with Postman/Insomnia
- [ ] Test authentication flow
- [ ] Test error responses
- [ ] Test validation errors
- [ ] Test rate limiting
- [ ] Test pagination
- [ ] Test with invalid tokens
- [ ] Test with expired tokens

### Integration Testing
- [ ] Frontend connects to backend
- [ ] Authentication works end-to-end
- [ ] Messages send and receive
- [ ] Real-time features work
- [ ] File uploads work
- [ ] Error handling works in UI

---

## 🚀 Deployment

### Server Setup
- [ ] Node.js installed (v14+)
- [ ] npm/yarn installed
- [ ] PM2 installed globally: `npm install -g pm2`
- [ ] Git installed (for deployment)
- [ ] Firewall configured (allow ports 80, 443, 3000)

### SSL/HTTPS
- [ ] Domain name configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Nginx/Apache configured as reverse proxy
- [ ] HTTPS redirect enabled
- [ ] SSL certificate auto-renewal configured

### Application Deployment
- [ ] Code deployed to server
- [ ] Dependencies installed: `npm install --production`
- [ ] `.env` file created on server
- [ ] Environment variables set correctly
- [ ] Logs directory created: `mkdir logs`
- [ ] File permissions set correctly

### Process Management
- [ ] PM2 configured: `pm2 start app.js --name chat-backend`
- [ ] PM2 startup script: `pm2 startup`
- [ ] PM2 save: `pm2 save`
- [ ] Auto-restart on crash enabled
- [ ] Log rotation configured

### Reverse Proxy (Nginx)
- [ ] Nginx installed
- [ ] Server block configured
- [ ] Proxy pass to Node.js app
- [ ] WebSocket support enabled
- [ ] SSL configured
- [ ] Gzip compression enabled
- [ ] Static file serving (if needed)

---

## 🔍 Post-Deployment

### Verification
- [ ] Server is running: `pm2 status`
- [ ] Health check works: `curl https://yourdomain.com/health`
- [ ] API endpoints accessible
- [ ] Socket.io connects
- [ ] Frontend can connect
- [ ] Authentication works
- [ ] Messages send/receive
- [ ] No errors in logs: `pm2 logs chat-backend`

### Monitoring
- [ ] PM2 monitoring enabled: `pm2 monitor`
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitoring (UptimeRobot, etc.)
- [ ] Log aggregation (if needed)
- [ ] Performance monitoring
- [ ] Database monitoring

### Backups
- [ ] Database backup script created
- [ ] Automated daily backups
- [ ] Backup restoration tested
- [ ] Backup retention policy set
- [ ] Off-site backup storage

### Documentation
- [ ] Deployment process documented
- [ ] Server credentials stored securely
- [ ] Emergency contacts listed
- [ ] Rollback procedure documented
- [ ] Monitoring dashboard URLs saved

---

## 📊 Performance

### Optimization
- [ ] Database indexes verified
- [ ] Query performance tested
- [ ] API response times acceptable (<200ms)
- [ ] Socket.io latency acceptable (<100ms)
- [ ] Memory usage monitored
- [ ] CPU usage monitored

### Scaling (if needed)
- [ ] Load balancer configured
- [ ] Multiple server instances
- [ ] Redis for session storage
- [ ] Redis for Socket.io adapter
- [ ] CDN for static assets
- [ ] Database read replicas

---

## 🔐 Security Audit

### Application Security
- [ ] All endpoints require authentication (where needed)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Mongoose handles this)
- [ ] XSS prevention (Helmet handles this)
- [ ] CSRF protection (if needed)
- [ ] Rate limiting working
- [ ] Password hashing verified
- [ ] JWT tokens expire correctly

### Server Security
- [ ] Firewall enabled
- [ ] SSH key authentication only
- [ ] Root login disabled
- [ ] Fail2ban installed
- [ ] Automatic security updates enabled
- [ ] Unnecessary services disabled
- [ ] Server hardening completed

### Network Security
- [ ] HTTPS only (no HTTP)
- [ ] Strong SSL configuration
- [ ] HSTS header enabled
- [ ] Secure cookies (if using)
- [ ] CORS properly configured
- [ ] DDoS protection (Cloudflare, etc.)

---

## 📱 Frontend Integration

### Configuration
- [ ] Frontend API URL updated to production
- [ ] Frontend Socket URL updated to production
- [ ] CORS origin matches frontend URL exactly
- [ ] Authentication flow tested
- [ ] Token storage secure (httpOnly cookies recommended)

### Testing
- [ ] Login works from frontend
- [ ] Registration works
- [ ] Google OAuth works (if enabled)
- [ ] Messages send/receive
- [ ] Real-time features work
- [ ] File uploads work
- [ ] Error handling works
- [ ] Loading states work

---

## 🚨 Emergency Procedures

### Rollback Plan
- [ ] Previous version tagged in Git
- [ ] Rollback script prepared
- [ ] Database migration rollback tested
- [ ] Downtime notification prepared

### Incident Response
- [ ] On-call schedule defined
- [ ] Escalation path documented
- [ ] Emergency contacts listed
- [ ] Status page configured
- [ ] Communication plan ready

---

## 📈 Monitoring & Alerts

### Alerts Configured
- [ ] Server down alert
- [ ] High CPU usage alert
- [ ] High memory usage alert
- [ ] Disk space alert
- [ ] Error rate alert
- [ ] Response time alert
- [ ] Database connection alert

### Dashboards
- [ ] Server metrics dashboard
- [ ] Application metrics dashboard
- [ ] Error tracking dashboard
- [ ] User activity dashboard
- [ ] API usage dashboard

---

## 📝 Documentation

### Updated
- [ ] API documentation reflects production URLs
- [ ] Frontend integration guide updated
- [ ] Deployment process documented
- [ ] Architecture diagram created
- [ ] Runbook created for operations

### Shared
- [ ] Documentation shared with team
- [ ] Access credentials shared securely
- [ ] Emergency procedures shared
- [ ] Monitoring dashboards shared

---

## ✅ Final Checks

### Before Going Live
- [ ] All checklist items completed
- [ ] Stakeholders notified
- [ ] Support team briefed
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan ready
- [ ] Monitoring active
- [ ] Backups verified

### After Going Live
- [ ] Monitor for 24 hours
- [ ] Check error logs
- [ ] Verify user activity
- [ ] Test critical paths
- [ ] Gather feedback
- [ ] Document issues
- [ ] Plan improvements

---

## 🎯 Production URLs

Document your production URLs here:

```
API Base URL: https://api.yourdomain.com
Health Check: https://api.yourdomain.com/health
Socket.io: https://api.yourdomain.com
Frontend: https://yourdomain.com

Monitoring:
- PM2: [URL]
- Error Tracking: [URL]
- Uptime Monitor: [URL]
- Logs: [URL]

Database:
- MongoDB Atlas: [URL]
- Backup Location: [URL]
```

---

## 📞 Emergency Contacts

```
Team Lead: [Name] - [Phone] - [Email]
DevOps: [Name] - [Phone] - [Email]
Database Admin: [Name] - [Phone] - [Email]
On-Call: [Name] - [Phone] - [Email]

Service Providers:
- Hosting: [Support URL/Phone]
- Database: [Support URL/Phone]
- CDN: [Support URL/Phone]
```

---

## 🎉 Deployment Complete!

Once all items are checked:

1. ✅ Mark deployment as complete
2. 📧 Notify stakeholders
3. 📊 Monitor for 24-48 hours
4. 📝 Document any issues
5. 🎯 Plan next iteration

**Congratulations on your deployment! 🚀**

---

## 📚 Additional Resources

- [README.md](./README.md) - Setup guide
- [SECURITY.md](./SECURITY.md) - Security guidelines
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration help
- [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) - What changed

---

## 🔄 Regular Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor server health
- [ ] Check uptime status

### Weekly
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Review security logs
- [ ] Test backups

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Security audit: `npm audit`
- [ ] Review and rotate logs
- [ ] Performance optimization
- [ ] Backup verification

### Quarterly
- [ ] Security review
- [ ] Architecture review
- [ ] Capacity planning
- [ ] Disaster recovery test
- [ ] Documentation update
