const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
// const mongoose = require('mongoose');
const bodyParser = require('body-parser');

require('./connection/mongoose.connection');

const app = express();

app.use(express.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
const server = http.createServer(app);

const dotenv = require('dotenv');
const { Server } = require('socket.io');
const cloudinary = require('cloudinary');


const Message = require('./models/message.model'); 
const {getAllUser} = require("./controllers/user.controller")
const User = require('./models/user.model')
const userRouter = require('./routes/user.route')

dotenv.config();



const io = new Server(server, {
    cors: {
        // Your frontend URL
        origin: "*", 
        methods: ["GET", "POST", "DELETE", "PUT"]
    }
});

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true
}));

app.use('/user', userRouter);

cloudinary.config ({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


const onlineUsers = new Map();

io.on('connection', (socket) => {
    // console.log('A user connected:', socket.id);
    // Fetch all users when a new user connects
      // Listen for a sendMessage event from the client
    //   socket.on('sendMessage', (message) => {
    //     console.log('Message received on backend:', message); // Log the received message
    //     // Broadcast the message to all connected clients
    //     io.emit('newMessage', message); // or use socket.broadcast.emit to exclude the sender
    //     console.log('Message broadcasted to clients:', message); // Log the broadcast
    // });

    getAllUser(socket);
     // Listen for 'user-online' event from client
     socket.on('user-online', (userId) => {
        // console.log(`User ${userId} is online with socket ID ${socket.id}`);
        onlineUsers.set(userId, socket.id);
        updateOnlineUsers();
    });

    // const onlineUsers = new Map();
        socket.on('typing', (data) => {
            const { senderId, receiverId, content } = data;
            io.to(receiverId).emit('typing', { senderId, isTyping: true, content, Date: new Date().toLocaleTimeString() });
            // Emit to sender as well, if you want them to see it
            // io.to(senderId).emit('typing', { senderId, isTyping: true, content, Date: new Date().toLocaleTimeString() });
        });
    
        socket.on('stopTyping', (data) => {
            const { senderId, receiverId, content } = data;
            io.to(senderId).emit('stopTyping', { senderId, isTyping: false , content, Date: new Date().toLocaleTimeString() });
        });


        // socket.on('chat message', async (payload) => {
        //     try {
        //         // Explicitly generate messageId if not present
        //         const messageData = {
        //             messageId: payload.messageId || uuidv4(),
        //             senderId: payload.senderId,
        //             receiverId: payload.receiverId,
        //             content: payload.content,
        //             users: payload.users || [payload.senderId, payload.receiverId],
        //             replyTo: payload.replyTo || null,
        //             timestamp: new Date()
        //         };
        
        //         console.log('Preparing to save message:', messageData);
        
        //         const newMessage = new Message(messageData);
        //         const savedMessage = await newMessage.save();
                
        //         console.log('Message saved successfully:', savedMessage.messageId);
        
        //         // Broadcast saved message
        //         socket.to(payload.receiverId).emit('new message', savedMessage);
        //     } catch (error) {
        //         console.error('Detailed Message Save Error:', {
        //             message: error.message,
        //             stack: error.stack,
        //             details: error.errors
        //         });
        //     }
        // });


         socket.on('chat message', async ({ messageId, senderId, receiverId, content, replyTo }) => {
        const data = {
            messageId,
            senderId,
            receiverId,
            content,
            users: [senderId, receiverId],
            replyTo,
        }
        try {
            // Create a new message
            const message = new Message({ senderId, receiverId, content, replyTo, users: [senderId, receiverId], messageId });
            const savedMessage = await message.save();
            // console.log('Message saved:', savedMessage);
            // Find the receiver of the chat message and send the message to that specific user through their socket connection.
             const user = await User.findOne({ _id: receiverId });
             const receiverSocketId = onlineUsers.get(receiverId) || user.socketId;
             if (receiverSocketId) {
                 io.to(receiverSocketId).emit('recievemessage', { senderId, receiverId, content, replyTo, timestamp: savedMessage.timestamp,messageId });
             }
            // // Emit the received message to the receiver's socket
            // io.to(user.socketId).emit('recievemessage', { senderId, receiverId, content, timestamp: savedMessage.timestamp });
            // Send a success response back to the client through the socket
            socket.emit('messageSent', { success: true, message: 'Message sent successfully', userMessage: { senderId, receiverId, content, messageId, users: [{ senderId, receiverId }] } });
        } catch (error) {
            console.error('Error saving message:', error);
            // Send an error response back to the client through the socket
            socket.emit('messageError', { success: false, error: error.message });
        }
    });


    // Listen for 'disconnect' event when a user disconnects
    socket.on('disconnect', () => {
        // console.log('User disconnected:', socket.id);
        for (let [userId, sockId] of onlineUsers.entries()) {
            if (sockId === socket.id) {
                // console.log(`User ${userId} with socket ID ${socket.id} is now offline`);
                onlineUsers.delete(userId);
                break;
            }
        }
        updateOnlineUsers()
    });

    function updateOnlineUsers() {
        const onlineUserIds = Array.from(onlineUsers.keys());
        // console.log('Online users:', onlineUserIds);
        io.emit('update-online-users', onlineUserIds);
    }
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
