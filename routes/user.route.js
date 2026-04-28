const express = require('express');
const router = express.Router();

const {
  registerUser,
  userLogin,
  googleAuth,
  getDashboard,
  fetchMessage,
  deleteMessage,
  forwardedMessage,
  handlePinMessage,
  handleUnpinMessage,
  fetchPinMessage,
  profilePicture,
  fetchProfilePicture,
  updateProfile,
  getUpdateProfile,
  searchUsers,
  getUnreadCount,
  markMessagesAsRead,
} = require('../controllers/user.controller');

const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { userValidators, messageValidators, validate } = require('../validators/user.validator');

// Public routes (no authentication required)
router.post('/signup', validate(userValidators.register), registerUser);
router.post('/signin', validate(userValidators.login), userLogin);
router.post('/googleAuth', validate(userValidators.googleAuth), googleAuth);

// Protected routes (authentication required)
router.use(authenticate); // All routes below require authentication

// User routes
router.get('/dashboard', getDashboard);
router.get('/search', searchUsers);
router.get('/getUpdateProfile', getUpdateProfile);
router.get('/fetchPicture', fetchProfilePicture);
router.put('/updateProfile/:userId', validate(userValidators.updateProfile), updateProfile);
router.post('/profilePicture', validate(userValidators.profilePicture), profilePicture);

// Message routes
router.get('/getMessage', fetchMessage);
router.get('/unreadCount', getUnreadCount);
router.post('/messages/read', markMessagesAsRead);
router.post('/messages/forward', validate(messageValidators.forward), forwardedMessage);
router.delete('/deleteMessage/:messageId', deleteMessage);

// Pin message routes
router.get('/getPinMessage', fetchPinMessage);
router.post('/pinMessage', validate(messageValidators.pin), handlePinMessage);
router.post('/unpinMessage', validate(messageValidators.unpin), handleUnpinMessage);

module.exports = router;