const asyncHandler = require('../utils/asyncHandler');
const ResponseHandler = require('../utils/responseHandler');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const messageService = require('../services/message.service');
const callService = require('../services/call.service');
const logger = require('../utils/logger');
const cloudinary = require('cloudinary').v2;
const config = require('../config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const registerUser = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  ResponseHandler.created(res, result, 'User registered successfully');
});

const userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  ResponseHandler.success(res, result, 'Login successful');
});

const googleAuth = asyncHandler(async (req, res) => {
  const { googleToken } = req.body;
  const result = await authService.googleAuth(googleToken);
  ResponseHandler.success(res, result, 'Google authentication successful');
});

const getDashboard = asyncHandler(async (req, res) => {
  // User is already attached by auth middleware
  ResponseHandler.success(res, { user: req.user }, 'Dashboard data retrieved');
});

const getAllUser = (socket) => {
  socket.on('getUsers', async ({ token }) => {
    try {
      const user = await authService.verifyToken(token);
      await userService.updateSocketId(user._id, socket.id);
      await userService.updateOnlineStatus(user._id, true);
      const result = await userService.getAllUsers(1, 100, user._id);
      socket.emit('getUsers', {
        success: true,
        message: 'Users retrieved',
        users: result.users,
      });
    } catch (error) {
      socket.emit('getUsers', {
        success: false,
        message: 'Error occurred: ' + error.message,
      });
    }
  });
};

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

const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id.toString();
  const deletedMessage = await messageService.deleteMessage(messageId, userId);
  // Emit socket event to notify receiver in real-time
  const io = req.app.get('io');
  if (io) {
    const socketHandler = req.app.get('socketHandler');
    if (socketHandler) {
      const receiverSocketId = socketHandler.getOnlineUsers().get(deletedMessage.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('messageDeleted', {
          messageId: deletedMessage.messageId,
          senderId: deletedMessage.senderId,
          deletedAt: deletedMessage.deletedAt
        });
      }
    }
  }
  ResponseHandler.success(res, null, 'Message deleted successfully');
});

const forwardedMessage = asyncHandler(async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  const result = await messageService.forwardMessage(messageId, senderId, receiverId);
  ResponseHandler.success(res, { forwardedMessages: result }, 'Messages forwarded successfully');
});

const handlePinMessage = asyncHandler(async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  const result = await messageService.pinMessage(messageId, senderId, receiverId);
  ResponseHandler.success(res, { pinnedMessage: result }, 'Message pinned successfully');
});

const handleUnpinMessage = asyncHandler(async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  await messageService.unpinMessage(messageId, senderId, receiverId);
  ResponseHandler.success(res, null, 'Message unpinned successfully');
});

const fetchPinMessage = asyncHandler(async (req, res) => {
  const { userId, receiverId } = req.query;
  const result = await messageService.fetchPinnedMessages(userId, receiverId);
  ResponseHandler.success(res, { pinnedMessages: result }, 'Pinned messages retrieved');
});

const profilePicture = asyncHandler(async (req, res) => {
  const { userId, base64 } = req.body;
  const user = await userService.updateProfilePicture(userId, base64);
  ResponseHandler.success(res, { user }, 'Profile picture updated successfully');
});

const fetchProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const user = await userService.getUserById(userId);
  ResponseHandler.success(res, { url: user.profilePicture }, 'Profile picture retrieved');
});

const updateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;
  const user = await userService.updateProfile(userId, updates);
  ResponseHandler.success(res, { user }, 'Profile updated successfully');
});

const getUpdateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  const user = await userService.getUserById(userId);
  ResponseHandler.success(res, { user }, 'User profile retrieved');
});

const searchUsers = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  if (!q) {
    return ResponseHandler.badRequest(res, 'Search query is required');
  }
  const result = await userService.searchUsers(q, parseInt(page), parseInt(limit));
  ResponseHandler.success(res, result, 'Search results retrieved');
});

const getUsers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await userService.getAllUsers(1, 100, userId);
  ResponseHandler.success(res, { users: result.users }, 'Users retrieved successfully');
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const count = await messageService.getUnreadCount(userId);
  ResponseHandler.success(res, { count }, 'Unread count retrieved');
});

const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { senderId } = req.body;
  const userId = req.user._id.toString();
  await messageService.markAsRead(userId, senderId);
  ResponseHandler.success(res, null, 'Messages marked as read');
});

const getCallHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const callHistory = callService.getCallHistory(userId);
  ResponseHandler.success(res, { callHistory }, 'Call history retrieved');
});

const uploadVoiceNote = asyncHandler(async (req, res) => {
  const { base64Audio, duration } = req.body;
  // Upload to Cloudinary
  const uploadResult = await cloudinary.uploader.upload(base64Audio, {
    resource_type: 'video', // Cloudinary uses 'video' for audio files too
    folder: 'chat-app/voice-notes',
    format: 'mp3',
  });
  ResponseHandler.success(res, {audioUrl: uploadResult.secure_url, duration: duration || 0,}, 'Voice note uploaded successfully');
});

module.exports = {
  registerUser,
  userLogin,
  googleAuth,
  getDashboard,
  getAllUser,
  getUsers,
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
  getCallHistory,
  uploadVoiceNote,
};
