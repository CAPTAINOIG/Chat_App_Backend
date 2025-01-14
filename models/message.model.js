const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    users: { type: [String], required: true },
    content: { type: String, required: true },
    replyTo: { type: String, required: false },
    isTyping: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
