const mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config()


const URI = process.env.URI;


mongoose.connect(URI)
  .then(() => {
    console.log('Mongoose connected successfully');
  })
  .catch((err) => {
    console.error('Mongoose connection error:', err.message);
  });
