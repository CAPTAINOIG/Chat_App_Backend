const asyncHandler = require('../utils/asyncHandler');
const ResponseHandler = require('../utils/responseHandler');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const messageService = require('../services/message.service');
const logger = require('../utils/logger');

/**
 * Register new user
 */
const registerUser = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  
  ResponseHandler.created(res, result, 'User registered successfully');
});

/**
 * User login
 */
const userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const result = await authService.login(email, password);
  
  ResponseHandler.success(res, result, 'Login successful');
});

/**
 * Google OAuth authentication
 */
const googleAuth = asyncHandler(async (req, res) => {
  const { googleToken } = req.body;
  
  const result = await authService.googleAuth(googleToken);
  
  ResponseHandler.success(res, result, 'Google authentication successful');
});

/**
 * Get dashboard (user profile)
 */
const getDashboard = asyncHandler(async (req, res) => {
  // User is already attached by auth middleware
  ResponseHandler.success(res, { user: req.user }, 'Dashboard data retrieved');
});

/**
 * Get all users (Socket.io handler)
 */
const getAllUser = (socket) => {
  socket.on('getUsers', async ({ token }) => {
    try {
      const user = await authService.verifyToken(token);
      
      // Update socket ID
      await userService.updateSocketId(user._id, socket.id);
      await userService.updateOnlineStatus(user._id, true);
      
      // Get all users
      const result = await userService.getAllUsers(1, 100, user._id);
      
      socket.emit('getUsers', {
        success: true,
        message: 'Users retrieved',
        users: result.users,
      });
    } catch (error) {
      logger.error('Get users error:', error);
      socket.emit('getUsers', {
        success: false,
        message: 'Error occurred',
      });
    }
  });
};

/**
 * Fetch messages between users
 */
const fetchMessage = asyncHandler(async (req, res) => {
  const { userId, receiverId, page = 1, limit = 50 } = req.query;
  
  const result = await messageService.fetchMessages(
    userId,
    receiverId,
    parseInt(page),
    parseInt(limit)
  );
  
  ResponseHandler.success(res, result, 'Messages retrieved');
});

/**
 * Delete message
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id.toString();
  
  await messageService.deleteMessage(messageId, userId);
  
  ResponseHandler.success(res, null, 'Message deleted successfully');
});

/**
 * Forward message
 */
const forwardedMessage = asyncHandler(async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  
  const result = await messageService.forwardMessage(messageId, senderId, receiverId);
  
  ResponseHandler.success(res, { forwardedMessages: result }, 'Messages forwarded successfully');
});

/**
 * Pin message
 */
const handlePinMessage = asyncHandler(async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  
  const result = await messageService.pinMessage(messageId, senderId, receiverId);
  
  ResponseHandler.success(res, { pinnedMessage: result }, 'Message pinned successfully');
});

/**
 * Unpin message
 */
const handleUnpinMessage = asyncHandler(async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  
  await messageService.unpinMessage(messageId, senderId, receiverId);
  
  ResponseHandler.success(res, null, 'Message unpinned successfully');
});

/**
 * Fetch pinned messages
 */
const fetchPinMessage = asyncHandler(async (req, res) => {
  const { userId, receiverId } = req.query;
  
  const result = await messageService.fetchPinnedMessages(userId, receiverId);
  
  ResponseHandler.success(res, { pinnedMessages: result }, 'Pinned messages retrieved');
});

/**
 * Update profile picture
 */
const profilePicture = asyncHandler(async (req, res) => {
  const { userId, base64 } = req.body;
  console.log('base64: ', base64);
  
  const user = await userService.updateProfilePicture(userId, base64);
  
  ResponseHandler.success(res, { user }, 'Profile picture updated successfully');
});

/**
 * Fetch profile picture
 */
const fetchProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  
  const user = await userService.getUserById(userId);
  console.log(user)
  
  ResponseHandler.success(res, { url: user.profilePicture }, 'Profile picture retrieved');
});

/**
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  
  const user = await userService.updateProfile(userId, updates);
  
  ResponseHandler.success(res, { user }, 'Profile updated successfully');
});

/**
 * Get user profile
 */
const getUpdateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  
  const user = await userService.getUserById(userId);
  
  ResponseHandler.success(res, { user }, 'User profile retrieved');
});

/**
 * Search users
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  
  if (!q) {
    return ResponseHandler.badRequest(res, 'Search query is required');
  }
  
  const result = await userService.searchUsers(q, parseInt(page), parseInt(limit));
  
  ResponseHandler.success(res, result, 'Search results retrieved');
});

/**
 * Get unread message count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  
  const count = await messageService.getUnreadCount(userId);
  
  ResponseHandler.success(res, { count }, 'Unread count retrieved');
});

/**
 * Mark messages as read
 */
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { senderId } = req.body;
  const userId = req.user._id.toString();
  
  await messageService.markAsRead(userId, senderId);
  
  ResponseHandler.success(res, null, 'Messages marked as read');
});

module.exports = {
  registerUser,
  userLogin,
  googleAuth,
  getDashboard,
  getAllUser,
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
};
