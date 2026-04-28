const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  users: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: false,
  },
  pinnedMessage: {
    type: String,
    required: false,
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for performance (using schema.index() method only)
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
messageSchema.index({ users: 1, timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
