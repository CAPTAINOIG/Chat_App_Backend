let User = require('../models/user.model')
let Message = require('../models/message.model')
const dotenv = require('dotenv')
const jwt = require("jsonwebtoken")
const nodemailer = require ('nodemailer')
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Conversation = require('../models/conversation.model')


dotenv.config();


const pass = process.env.PASS;
const USERMAIL = process.env.USERMAIL;


const transporter = nodemailer.createTransport({
    // host: 'smtp.example.com',
    service: 'gmail',
    auth: {
      user: USERMAIL,
      pass: pass
    }
  })
  
  const Captain =
    "https://res.cloudinary.com/dbp6ovv7b/image/upload/v1715783819/tvf5apwj5bwmwf2qjfhh.png";


const registerUser = (req, res) => {
    let form = new User(req.body);
    const { username, email, password } = req.body;
    const newUser = new User({
        username, email, password
    })
    // console.log(newUser);
    newUser.save()
      .then((result) => {
        // console.log(result);
        res.status(200).json({ status: true, message: "User signed up successfully", result });
        console.log('✔ user found', email);
        const mailOptions = {
          from: process.env.USER,
          to: email,
          subject: "Welcome to Captain Chat App",
          html: `
            <div style="background-color: rgb(4,48,64); padding: 20px; color: rgb(179,148,113); border-radius: 5px">
              <img src="${Captain}" alt="Captain College Logo" style="max-width: 150px; height: 130px; margin-bottom: 20px; margin-left: 300px;">
              <div style="text-align: center;">
              <p style="font-size: 18px;">Hello, ${username}!</p>
              <p style="font-size: 16px;">Welcome to Captain Chat App! We're thrilled that you've chosen to register with us.</p>
              <p style="font-size: 16px;">If you have any questions or need assistance, feel free to reach out @abdullahisamsudeen@gmail.com.</p>
              <p style="font-size: 16px;">Thank you for joining us.</p>
              <p style="font-size: 16px;">Best regards,</p>
              <p style="font-size: 16px;">The Captain Chat App Team</p>
              </div>
            </div>
          `,
        };
          return transporter.sendMail(mailOptions)
      })
      .catch((err) => {
        console.error(err);
        if (err.code === 11000) {
          res.status(409).json({ status: false, message: "Duplicate user found" });
        } else {
          res.status(400).json({ status: false, message: "Fill in appropriately" });
        }
      });
  }


  const userLogin = async (req, res) => {
    // console.log(req.body);
    const { password, email } = req.body;
    try {
      const user = await User.findOne({ email });
      // email checking
      if (user) {
        // then password here
        const secrete = process.env.SECRET;
        user.validatePassword(password, (err, same) => {
          if (err) {
            res.status(500).json({ message: "Server error", status: false });
          } else {
            if (same) {
              const token = jwt.sign({ email }, secrete, { expiresIn: "5d" });
              // console.log(token);
              res.status(200).json({ message: "User signed in successfully", status: true, token, user });
            } else {
              res.status(401).json({ message: "Wrong password, please type the correct password", status: false });
            }
          }
        });
      }
      // To check for email validation
       else {
        res.status(404).json({ message: "Wrong email, please type the correct email", status: false });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", status: false });
    }
  }

  const getDashboard = async (req, res) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token missing or malformed', status: false });
      }
  
      const token = authHeader.split(' ')[1];
      const secret = process.env.SECRET;
  
      // Verify token
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
  
      // Find user by email from token
      const userDetail = await User.findOne({ email: decoded.email });
      if (!userDetail) {
        return res.status(404).json({ message: 'User not found', status: false });
      }
  
      // Respond with user details
      res.json({ message: 'Congratulations', status: true, userDetail });
  
    } catch (err) {
      console.error('Error occurred:', err);
      res.status(500).json({ message: 'Internal Server Error', status: false });
    }
  };
  

  const getAllUser = (socket) => {
    socket.on("getUsers", async ({ token }) => {
      
      const secret = process.env.SECRET;
  
      try {
        const result = jwt.verify(token, secret);
        // Update the user's socketId in the database to keep track of the connection
        await User.findOneAndUpdate({ email: result.email }, { socketId: socket.id });
        // Fetch all users from the database, excluding their passwords
        const userDetail = await User.find({}).select("-password"); 
        // Send the list of users back to the client
        socket.emit("getUsers", { message: "Congratulations", status: true, users: userDetail });
      } catch (err) {
        // Emit an error message if token verification fails or other errors occur
        socket.emit("getUsers", { message: "Error Occurred", status: false });
      }
    });
  };
  
  // we fetch user info here
  // const fetchMessage = async (req, res) => {
  //   const { userId, receiverId, messageId } = req.query;
  //   // console.log(userId, receiverId)
  //   try { 
  //     const userDetail = await User.find({}).select("-password"); 
  //     const messages = await Message.find({users:{$all:[userId, receiverId]}})
  //     console.log(messages)
  //     console.log(messageId)
  //       res.status(200).json({ status: true, messages, userDetail });
  //   } catch (error) {
  //       // console.error('Error fetching messages:', error);
  //       res.status(500).json({ status: false, error: 'Error fetching messages' });
  //   }
  // };

  const fetchMessage = async (req, res) => {
    const { userId, receiverId, messageId } = req.query;

    try {
        // Build the query for messages
        const query = {
            users: { $all: [userId, receiverId] }
        };

        // If messageId is provided, use it to fetch a specific message
        if (messageId) {
            query.messageId = messageId; // Use the custom messageId field
        }

        // Fetch messages based on the constructed query
        const messages = await Message.find(query);
        console.log(messages);

        // Fetch user details excluding password
        const userDetail = await User.find({}).select("-password");

        res.status(200).json({ 
            status: true, 
            messages, 
            userDetail 
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ 
            status: false, 
            error: 'Error fetching messages' 
        });
    }
};

  const deleteMessage = async (req, res) => {
    const { messageId } = req.params; 
    console.log(messageId)
    if (!messageId) {
      return res.status(400).json({ status: false, message: 'Invalid message ID' });
    }
    try {
      const userDetail = await User.find({}).select("-password"); 
      await Message.deleteOne({ messageId: messageId });
      res.status(200).json({ status: true, message: 'Message deleted successfully' });
    } catch (error) {
      res.status(500).json({ status: false, error: 'Error deleting message' });
    }
  };

  const forwardedMessage = async (req, res) => {
    const userDetail = await User.find({}).select("-password"); 
    console.log(userDetail);
    const { messageId, senderId, receiverId } = req.body;
    console.log(messageId, senderId, receiverId);

    if (!messageId || !senderId || !receiverId || receiverId.length === 0) {
        return res.status(400).json({ error: "Invalid input" });
    }

    try {
        // Find the original message
        const originalMessage = await Message.findById(messageId);
        if (!originalMessage) {
            return res.status(404).json({ error: "Message not found" });
        }

        // Forward the message to each recipient
        const forwardedMessages = [];
        for (const receiverId of receiverId) {
            const newMessage = new Message({
                senderId: senderId,
                content: originalMessage.content,
                forwardedFrom: originalMessage.senderId,
                receiverId: receiverId,
            });

            await newMessage.save();
            forwardedMessages.push(newMessage);
        }

        res.status(200).json({
            status: "success",
            forwardedMessages,
        });
    } catch (error) {
        console.error("Error forwarding message:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// const handlePinMessage = async (req, res) => {
//     const {messageId, senderId, receiverId } = req.body;
//     if (!messageId || !senderId || !receiverId) {
//       return res.status(400).json({status: false, error: "Invalid input", message: "Invalid input"});
//     }
//     try {
//       console.log(messageId);
//       const originalMessage = await Message.findOne({ $or: [
//         { messageId: messageId },
//         { _id: messageId }
//     ]});
//       if (!originalMessage) {
//         return res.status(404).json({ error: "Message not found" });
//       }
//       const existingPinnedMessage = await Message.findOne({
//         senderId,
//         receiverId,
//         pinnedMessage: messageId,
//       });
//       if (existingPinnedMessage) {
//         return res.status(400).json({status: false, error: "Message already pinned", message: "Message already pinned"});
//       }
//       const pinnedMessages = [];
//         const newMessage = new Message({
//           senderId: senderId,
//           content: originalMessage.content,
//           pinnedMessage: originalMessage.messageId,
//           receiverId: receiverId,
//         });
  
//         await newMessage.save();
//         pinnedMessages.push(newMessage);
//       res.status(200).json({status: "success", pinnedMessages, message: "Message pinned successfully"});
//     } catch (error) {
//       res.status(500).json({ error: "Internal server error" });
//     }
//   };

const handlePinMessage = async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  
  console.log('Pin Message Request:', { messageId, senderId, receiverId });

  if (!messageId || !senderId || !receiverId) {
      return res.status(400).json({
          status: false, 
          error: "Invalid input parameters"
      });
  }

  try {
      // Comprehensive message finding
      const originalMessage = await Message.findOne({messageId: messageId});

      console.log('Original Message Found:', originalMessage);

      if (!originalMessage) {
          return res.status(404).json({ 
              status: false,
              error: "Message not found",
              details: { messageId, searchedFields: ['messageId', '_id'] }
          });
      }

      // Validate message fields
      if (!originalMessage.content) {
          return res.status(400).json({
              status: false,
              error: "Invalid message content"
          });
      }

      const newMessage = new Message({
          senderId,
          content: originalMessage.content,
          pinnedMessage: originalMessage.messageId,
          receiverId,
          users: [senderId, receiverId]
      });

      const savedMessage = await newMessage.save();

      res.status(200).json({
          status: "success", 
          pinnedMessages: [savedMessage], 
          message: "Message pinned successfully"
      });
  } catch (error) {
      console.error('Detailed Pin Message Error:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
          errorObject: error
      });

      res.status(500).json({ 
          status: false,
          error: "Internal server error",
          details: error.message,
          errorName: error.name
      });
  }
};
  const handleUnpinMessage = async (req, res) => {
    const { messageId, senderId, receiverId } = req.body;
    if (!messageId || !senderId || !receiverId) {
      return res.status(400).json({status: false,  error: "Invalid input", message: "Invalid input"});
    }
    try {
      const existingPinnedMessage = await Message.findOne({senderId, receiverId, pinnedMessage: messageId});
      if (!existingPinnedMessage) {
        return res.status(404).json({status: false, error: "Message not found", message: "Message not found"});
      }
      await Message.findByIdAndDelete(existingPinnedMessage.messageId);
      res.status(200).json({status: "success", message: "Message unpinned successfully"});
    } 
    catch (error) {
      console.error("Error pinning message:", error);
      res.status(500).json({status: false, error: "Internal server error", message: "Internal server error"});
    }
  }

  const fetchPinMessage = async (req, res) => {
    const { userId, receiverId } = req.query; 
    try {
      const pinMessage = await Message.find({
        senderId: userId,
        receiverId: receiverId,
        pinnedMessage: { $exists: true } 
      });
      res.status(200).json({ status: true, pinMessage, message: "Pinned messages fetched successfully"});
    } catch (error) {
      res.status(500).json({ status: false, error: 'Error fetching messages' });
    }
  };
  


  module.exports = {registerUser, userLogin, getDashboard, getAllUser, fetchMessage, deleteMessage, forwardedMessage, handlePinMessage, fetchPinMessage, handleUnpinMessage};