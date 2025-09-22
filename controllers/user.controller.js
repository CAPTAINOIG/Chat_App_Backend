let User = require('../models/user.model')
let Message = require('../models/message.model')
// const dotenv = require('dotenv')
const jwt = require("jsonwebtoken")
const nodemailer = require ('nodemailer')
const cloudinary = require('cloudinary')
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); 

const pass = process.env.PASS;
const USERMAIL = process.env.USERMAIL;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: USERMAIL,
      pass: pass
    }
  })
  
  const Captain = "https://res.cloudinary.com/dbp6ovv7b/image/upload/v1715783819/tvf5apwj5bwmwf2qjfhh.png";

const registerUser = (req, res) => {
    let form = new User(req.body);
    const { username, email, password, number } = req.body;
    const newUser = new User({username, email, password, number});
    newUser.save()
      .then((result) => {
        res.status(200).json({ status: true, message: "User signed up successfully", result });
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
        if (err.code === 11000) {
          res.status(409).json({ status: false, message: "Duplicate user found" });
        } else {
          res.status(400).json({ status: false, message: "Fill in appropriately" });
        }
      });
  }

  const userLogin = async (req, res) => {
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
      res.status(500).json({ message: "Server error", status: false });
    }
  }

  // For Google Authentication
const googleAuth = async (req, res) => {
  try {
    const googleToken = req.body.googleToken;
    if (!googleToken) {
      return res.status(400).json({ message: "Google token is required" });
    }
    // Verify Google token and create JWT for the user
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { email, name, sub } = ticket.getPayload();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, username: name, googleId: sub, password: 'google-auth-user'  });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.SECRET, { expiresIn: '7d' });
    return res.json({ message: "User authenticated", status: true, userToken: token, userDetail: user });

  } catch (err) {
    console.error('Error during Google authentication:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

  const getDashboard = async (req, res) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token missing or malformed', status: false });
      }
      const token = authHeader.split(' ')[1];
      const secret = process.env.SECRET;
      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      const userDetail = await User.findOne({ email: decoded.email });
      if (!userDetail) {
        return res.status(404).json({ message: 'User not found', status: false });
      }
      res.json({ message: 'Congratulations', status: true, userDetail });
  
    } catch (err) {
      res.status(500).json({ message: 'Internal Server Error', status: false });
    }
  };

  // Note: base64 and usrId are payload coming from frontend
  const profilePicture = async (req, res) => {
    const { userId, base64 } = req.body;
    try {
      const uploadResult = await cloudinary.v2.uploader.upload(base64);
      const userDetail = await User.findOneAndUpdate({_id: userId }, { $set: { profilePicture: uploadResult.secure_url } },  { new: true });
      if (!userDetail) {
        return res.status(404).json({ message: 'Profile picture not found', status: false });
      } else {
        return res.status(200).json({ message: 'Profile picture updated successfully', status: true, profilePicture: uploadResult.secure_url, userDetail });
      }
    }
    catch (error) {
      res.status(500).json({ message: 'Internal server error', status: false });
    }
  }

const fetchProfilePicture = async (req, res) => {
    const { userId } = req.query;
      try {
      const profilePicture = await User.findOne({ _id: userId });
      if (!profilePicture) {
        return res.status(404).json({ message: 'Profile picture not found', status: false });
      }
      const url = profilePicture.profilePicture;
      res.status(200).json({ message: 'Profile picture updated', status: true, url });
    }
    catch (error) {
      res.status(500).json({ message: 'Internal server error', status: false });
    }
  }

  const updateProfile = async (req, res) => {
    const {userId} = req.params;
    const {profileName, aboutMe} = req.body;
    try {
      if(!userId) {
        return res.status(400).json({ message: 'Invalid user ID', status: false });
      }
      const updatedUser = {profileName: profileName, aboutMe: aboutMe};
      if(!updatedUser) {
        return res.status(400).json({ message: 'Invalid profile details', status: false });
      }
     const response = await User.findOneAndUpdate({_id: userId}, updatedUser)
      res.status(200).json({ message: 'Profile updated successfully', status: true, updatedUser });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', status: false });
    }
  }

  const getUpdateProfile = async (req, res) => {
    const { userId } = req.query;
    try {
      const userDetail = await User.findOne({ _id: userId });
      if (!userDetail) {
        return res.status(404).json({ message: 'User not found', status: false });
      }
      res.status(200).json({ message: 'User profile fetched successfully', status: true, userDetail });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', status: false });
    }
  }
  

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
  const fetchMessage = async (req, res) => {
    const { userId, receiverId, messageId } = req.query;
    // console.log(userId, receiverId, messageId)
    try { 
      const userDetail = await User.find({}).select("-password"); 
      const messages = await Message.find({users:{$all:[userId, receiverId]}})
        res.status(200).json({ status: true, messages, userDetail });
    } catch (error) {
        // console.error('Error fetching messages:', error);
        res.status(500).json({ status: false, error: 'Error fetching messages' });
    }
  };

  const deleteMessage = async (req, res) => {
    const { messageId } = req.params; 
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
    const { messageId, senderId, receiverId } = req.body;
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
        res.status(500).json({ error: "Internal server error" });
    }
}

const handlePinMessage = async (req, res) => {
  const { messageId, senderId, receiverId } = req.body;
  if (!messageId || !senderId || !receiverId) {
      return res.status(400).json({
          status: false, 
          error: "Invalid input parameters"
      });
  }

  try {
      const originalMessage = await Message.findOne({messageId, senderId, receiverId});
      if (!originalMessage) {
          return res.status(404).json({status: false, error: "Message not found", message: "Message not found", details: { messageId, searchedFields: ['messageId', '_id'] }
          });
      }
      if (!originalMessage.content) {
          return res.status(400).json({status: false, error: "Invalid message content", message: "Invalid message content"});
      }
      const existingPinnedMessage = await Message.findOne({senderId, receiverId,  pinnedMessage: originalMessage.messageId });
      if(existingPinnedMessage){
        return res.status(400).json({
          status: false,
          message: "Message already pinned",
          error: "Message already pinned",
        });
      }
      const newMessage = new Message({
          senderId,
          content: originalMessage.content,
          messageId: originalMessage.messageId,
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
      const existingPinnedMessage = await Message.findOne({senderId, receiverId, messageId});
      if (!existingPinnedMessage) {
        return res.status(404).json({status: false, error: "Message not found", message: "Message not found"});
      }
      await Message.findByIdAndDelete(existingPinnedMessage._id)
      res.status(200).json({status: "success", message: "Message unpinned successfully"});
    } 
    catch (error) {
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
  


  module.exports = {registerUser, userLogin, getDashboard, getAllUser, fetchMessage, deleteMessage, forwardedMessage, handlePinMessage, fetchPinMessage, handleUnpinMessage, profilePicture, fetchProfilePicture, updateProfile, getUpdateProfile, googleAuth};