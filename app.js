const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
// const mongoose = require('mongoose');
const bodyParser = require("body-parser");

require("./connection/mongoose.connection");

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
const server = http.createServer(app);

const dotenv = require("dotenv");
const { Server } = require("socket.io");
const cloudinary = require("cloudinary");

const Message = require("./models/message.model");
const { getAllUser } = require("./controllers/user.controller");
const User = require("./models/user.model");
const userRouter = require("./routes/user.route");

dotenv.config();

const io = new Server(server, {
  cors: {
    // Your frontend URL
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
  },
});

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use("/user", userRouter);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
//   console.log("✅ User connected:", socket.id);
  getAllUser(socket);
  // Listen for 'user-online' event from client
  socket.on("user-online", (userId) => {
    onlineUsers.set(userId, socket.id);
    updateOnlineUsers();
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId, receiverId } );
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId, receiverId } );
    }
  });

  socket.on(
    "chat message",
    async ({ messageId, senderId, receiverId, content, replyTo }) => {
      const data = {
        messageId,
        senderId,
        receiverId,
        content,
        users: [senderId, receiverId],
        replyTo,
      };
      try {
        // Create a new message
        const message = new Message({
          senderId,
          receiverId,
          content,
          replyTo,
          users: [senderId, receiverId],
          messageId,
        });
        const savedMessage = await message.save();
        // console.log('Message saved:', savedMessage);
        // Find the receiver of the chat message and send the message to that specific user through their socket connection.
        const user = await User.findOne({ _id: receiverId });
        const receiverSocketId = onlineUsers.get(receiverId) || user.socketId;
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("recievemessage", {
            senderId,
            receiverId,
            content,
            replyTo,
            timestamp: savedMessage.timestamp,
            messageId,
          });
        }
        // // Emit the received message to the receiver's socket
        // io.to(user.socketId).emit('recievemessage', { senderId, receiverId, content, timestamp: savedMessage.timestamp });
        // Send a success response back to the client through the socket
        socket.emit("messageSent", {
          success: true,
          message: "Message sent successfully",
          userMessage: {
            senderId,
            receiverId,
            content,
            messageId,
            users: [{ senderId, receiverId }],
          },
        });
      } catch (error) {
        console.error("Error saving message:", error);
        // Send an error response back to the client through the socket
        socket.emit("messageError", { success: false, error: error.message });
      }
    }
  );

  // Listen for 'disconnect' event when a user disconnects
  socket.on("disconnect", () => {
    // console.log('User disconnected:', socket.id);
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        // console.log(`User ${userId} with socket ID ${socket.id} is now offline`);
        onlineUsers.delete(userId);
        break;
      }
    }
    updateOnlineUsers();
  });

  function updateOnlineUsers() {
    const onlineUserIds = Array.from(onlineUsers.keys());
    console.log('Online users:', onlineUserIds);
    io.emit("update-online-users", onlineUserIds);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {});
