// const express = require('express');
// const http = require('http');
// const cors = require('cors');
// const { Server } = require('socket.io');
// const bodyParser = require('body-parser');
// const dotenv = require('dotenv');

// dotenv.config();

// const app = express();
// const port = process.env.PORT || 3000; // Use environment variable for port

// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: "http://localhost:5173", // Update to match your frontend URL
//         methods: ["GET", "POST"]
//     }
// });

// // Middleware setup
// app.use(cors({
//     origin: "http://localhost:5173", // Your frontend URL
//     methods: ["GET", "POST"],
//     credentials: true
// }));
// app.use(express.json({ limit: "50mb" }));
// app.use(bodyParser.urlencoded({ extended: true }));

// // Connect to database
// require('./connection/mongoose.connection');

// // Routes
// const userRouter = require('./routes/user.route');
// app.use('/user', userRouter);

// // Initialize models
// require('./models/user.model');

// // Basic route for testing
// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

// // Socket.io connection handling
// // io.on('connection', (socket) => {
// //     console.log('A user connected:', socket.id);

// //     socket.on('chat message', (msg) => {
// //         io.emit('chat message', msg);
// //     });

// //     socket.on('disconnect', () => {
// //         console.log('User disconnected:', socket.id);
// //     });
// // });

// io.on('connection', (socket) => {
//     console.log('A user connected');

//     // Listen for incoming messages
//     socket.on('sendMsg', async (data) => {
//         try {
//             const { senderId, receiverId, content } = data;

//             // Save the message to the database
//             const message = new Message({
//                 sender: senderId,
//                 receiver: receiverId,
//                 content: content
//             });

//             await message.save();

//             // Broadcast the message to the receiver
//             socket.to(receiverId).emit('receiveMsg', {
//                 senderId,
//                 content
//             });
//         } catch (error) {
//             console.error('Error saving message:', error);
//         }
//     });

//     socket.on('disconnect', () => {
//         console.log('User disconnected');
//     });
// });

// // Start the server
// server.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
// });



// index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

// Import routes
const messageRoutes = require('./routes/user.route');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Your frontend URL
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB


// Middleware setup
app.use(cors({
       origin: "http://localhost:5173", // Your frontend URL
     methods: ["GET", "POST"],
       credentials: true
 }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use('/user', userRouter);

// Socket.IO event handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);


    // socket.on('recivemessage', async ({ senderId, receiverId, content }) => {
    //     try {
    //         // Save message to the database
    //         const message = new Message({ senderId, receiverId, content });
    //         console.log(message);
    //         await message.save();

    //         // Broadcast message to all clients
    //         io.emit('recivemessage', { senderId, receiverId, content, timestamp: message.timestamp });
    //     } catch (error) {
    //         console.error('Error saving message:', error);
    //     }
    // });

    socket.on('chat message', async ({ senderId, receiverId, content }) => {
        try {
            // Save message to the database
            const message = new Message({ senderId, receiverId, content });
            console.log(message);
            await message.save();

            // Broadcast message to all clients
            io.emit('recievemessage', { senderId, receiverId, content, timestamp: message.timestamp });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


