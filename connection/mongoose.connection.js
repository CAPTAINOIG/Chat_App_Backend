// require('dotenv').config(); // This will load the variables from the .env file
const dotenv = require('dotenv')
dotenv.config()
const mongoose = require('mongoose');


const URI = process.env.URI;


mongoose.connect(URI)
  .then(() => {
    console.log('Mongoose connected successfully');
    // Your further code after the successful connection can be added here
  })
  .catch((err) => {
    console.error('Mongoose connection error:', err.message);
  });
