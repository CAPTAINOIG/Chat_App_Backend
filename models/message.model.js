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
  type: {
    type: String,
    enum: ['text', 'voice'],
    default: 'text',
    required: true,
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    },
    maxlength: 5000,
  },
  audioUrl: {
    type: String,
    required: function() {
      return this.type === 'voice';
    },
  },
  duration: {
    type: Number, // in seconds
    required: function() {
      return this.type === 'voice';
    },
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
  deliveryStatus: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  deliveredAt: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Optimized indexes for better performance
messageSchema.index({ users: 1, timestamp: -1 }); // Primary query index
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 }); // Direct conversation index
messageSchema.index({ receiverId: 1, isRead: 1 }); // Unread messages
messageSchema.index({ receiverId: 1, deliveryStatus: 1 }); // Delivery status

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
