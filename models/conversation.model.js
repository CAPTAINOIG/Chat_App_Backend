const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    users: { type: [String], required: true },
    content: { type: String, required: true },
    replyTo: { type: String, required: false },
    isTyping: { type: Boolean, default: false },
    // pinnedMessage: { type: String, required: false },
    pinnedMessages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      }],
    forwardedFrom: { type: String }, 
    timestamp: { type: Date, default: Date.now }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;