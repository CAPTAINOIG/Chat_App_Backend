const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  googleId: {
    type: String,
    sparse: true,
  },
  number: {
    type: String,
    required: false,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    minlength: 6,
  },
  socketId: {
    type: String,
    required: false,
  },
  profilePicture: {
    type: String,
    required: false,
    default: 'https://res.cloudinary.com/dbp6ovv7b/image/upload/v1715783819/tvf5apwj5bwmwf2qjfhh.png',
  },
  aboutMe: {
    type: String,
    required: false,
    default: 'Hey there, I am using chat app',
    maxlength: 200,
  },
  profileName: {
    type: String,
    required: false,
    default: 'Anonymous',
    maxlength: 50,
  },
  otp: {
    type: String,
    required: false,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
}, {
  timestamps: true,
});


const saltRounds = 10;

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified or new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const hash = await bcrypt.hash(this.password, saltRounds);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

// Method to validate password
userSchema.methods.validatePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

// Method to get public profile
userSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    profilePicture: this.profilePicture,
    aboutMe: this.aboutMe,
    profileName: this.profileName,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
  };
};

// Indexes for performance (using schema.index() method only)
userSchema.index({ isOnline: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
