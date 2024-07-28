let User = require('../models/user.model')
let Message = require('../models/message.model')
const dotenv = require('dotenv')
const jwt = require("jsonwebtoken")
const nodemailer = require ('nodemailer')
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');


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
    console.log(req.body);
    const { password, email } = req.body;
    try {
      const user = await User.findOne({ email });
  
      if (user) {
        const secrete = process.env.SECRET;
        user.validatePassword(password, (err, same) => {
          if (err) {
            res.status(500).json({ message: "Server error", status: false });
          } else {
            if (same) {
              const token = jwt.sign({ email }, secrete, { expiresIn: "10h" });
              console.log(token);
              res.status(200).json({ message: "User signed in successfully", status: true, token, user });
            } else {
              res.status(401).json({ message: "Wrong password, please type the correct password", status: false });
            }
          }
        });
      } else {
        res.status(404).json({ message: "Wrong email, please type the correct email", status: false });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", status: false });
    }
  }

  const getDashboard = (req, res) => {
    let token = (req.headers.authorization.split(" ")[1]);
    const secrete = process.env.SECRET;
    jwt.verify(token, secrete, (err, result) => {
  
      if (err) {
        console.log(err);
        res.send({ message: "Error Occured", status: false })
      }
  
      else {
        User.findOne({ email: result.email })
          .then((userDetail) => {
            // console.log(userDetail);
            res.send({ message: "Congratulations", status: true, userDetail })
  
          })
      }
    })
  }

  // we fetch all the users here
// we use emit to send msg to the client side instead of res.send
  const getAllUser = (socket) => {
    socket.on("getUsers",({token})=>{
    const secrete = process.env.SECRET;
    jwt.verify(token, secrete, async(err, result) => {
  
      if (err) {
        socket.emit("getUsers",{ message: "Error Occured", status: false })
      }
      else {
       await User.findOneAndUpdate({email:result.email},{socketId:socket.id})
        User.find({ }).select("-password")
          .then((userDetail) => {
            socket.emit("getUsers",{ message: "Congratulations", status: true,users: userDetail })
          })
      }
    })
    })
  }

  // user create msg and send it then save on database
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

  // we fetch user info here
  const fetchMessage = async (req, res) => {
    console.log(req.query)
    const { userId, receiverId } = req.query;
    try { 
      const messages = await Message.find({users:{$all:[userId,receiverId]}})
      console.log(messages)
        res.status(200).json({ status: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ status: false, error: 'Error fetching messages' });
    }
  };


  module.exports = {registerUser, userLogin, getDashboard, getAllUser, fetchMessage};