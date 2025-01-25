// models/user.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    // unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  socketId : {
    type:String,
    required: false,
  },

  profilePicture: {
    type: String,
    required: false,
  },

  otp: {
    type: String,
    required: false,
  },

  pinnedMessages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      // Reference to the Message model
      ref: 'Message', 
    }
  ]
});


let saltRounds = 10
userSchema.pre('save', function(next){
    console.log(this.password, 'the existing password');
    bcrypt.hash(this.password, saltRounds)

.then((response) => {
    console.log(response);
    this.password = response
    next()
})
.catch(err =>{
    console.log(err);
})
})


userSchema.methods.validatePassword = function(password, callback){
    // console.log(password, 'the hashed one');
    // console.log(this);
    bcrypt.compare(password,this.password,(err,same)=>{
        console.log(same);
        if(!err){
            callback(err, same)
        }else{
            next()
        }
    })
}

const User = mongoose.model('User', userSchema);

module.exports = User;
