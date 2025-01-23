const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    messageId: {type: String, required: false},
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    users: { type: [String], required: true },
    content: { type: String, required: true },
    replyTo: { type: String, required: false },
    isTyping: { type: Boolean, default: false },
    pinnedMessage: { type: String, required: false },
    // pinnedMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: false },
    forwardedFrom: { type: String }, 
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
