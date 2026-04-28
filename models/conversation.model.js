const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageTime: {
    type: Date,
    default: Date.now,
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
}, {
  timestamps: true,
});

// Compound index for efficient participant queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageTime: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;