const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Message = require('./models/message.model'); // Import the Message model
const {getAllUser}=require("./controllers/user.controller")

const User = require('./models/user.model')

dotenv.config();

require('./connection/mongoose.connection');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Your frontend URL
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: "*", // Your frontend URL
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const userRouter = require('./routes/user.route')
app.use('/user', userRouter);


const onlineUsers = new Map();
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Fetch all users when a new user connects
    getAllUser(socket);

     // Listen for 'user-online' event from client
     socket.on('user-online', (userId) => {
        onlineUsers.set(userId, socket.id);
        updateOnlineUsers();
    });
    // Listen for 'chat message' event from client
    socket.on('chat message', async ({ senderId, receiverId, content }) => {
        try {
            // Create a new message
            const message = new Message({ senderId, receiverId, content, users: [senderId, receiverId] });
            const savedMessage = await message.save();
            console.log('Message saved:', savedMessage);
            // Find the receiver of the chat message and send the message to that specific user through their socket connection.
             // Find the receiver of the chat message and send the message to that specific user through their socket connection.
             const user = await User.findOne({ _id: receiverId });
             const receiverSocketId = onlineUsers.get(receiverId) || user.socketId;
             if (receiverSocketId) {
                 io.to(receiverSocketId).emit('recievemessage', { senderId, receiverId, content, timestamp: savedMessage.timestamp });
             }
            // // Emit the received message to the receiver's socket
            // io.to(user.socketId).emit('recievemessage', { senderId, receiverId, content, timestamp: savedMessage.timestamp });
            // Send a success response back to the client through the socket
            socket.emit('messageSent', { success: true, message: 'Message sent successfully', userMessage: { senderId, receiverId, content, users: [{ senderId, receiverId }] } });
        } catch (error) {
            console.error('Error saving message:', error);
            // Send an error response back to the client through the socket
            socket.emit('messageError', { success: false, error: error.message });
        }
    });

    // Listen for 'disconnect' event when a user disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (let [userId, sockId] of onlineUsers.entries()) {
            if (sockId === socket.id) {
                onlineUsers.delete(userId);
                break;
            }
        }
        updateOnlineUsers()
    });
    function updateOnlineUsers() {
        const onlineUserIds = Array.from(onlineUsers.keys());
        io.emit('update-online-users', onlineUserIds);
    }
});



    // const createMessage = async (req, res) => {
    //     try {
    //         const { senderId, receiverId, content } = req.body;
    //         // Create a new message
    //         const message = new Message({ senderId, receiverId, content, users:[senderId, receiverId,]});
    //         console.log(message);
    
    //         const _res=await message.save();
    //       console.log(_res)
    
    //         res.status(200).send({ success: true, message: 'Message sent successfully', userMessage: {senderId, receiverId, content, users:[{senderId, receiverId,}]} });
    //     } catch (error) {
    //         res.status(500).send({ success: false, error: error.message });
    //     }
    // };

   

// io.on('connection', (socket) => {
//     console.log('A user connected:', socket.id);

//     getAllUser(socket);
//     handleChatMessage(socket, io);
    // handleDisconnect(socket);
// });



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
