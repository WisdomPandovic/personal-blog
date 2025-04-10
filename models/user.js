const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,required: true, unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Convert email to lowercase for case-insensitive matching
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  savedAddresses: [
    {
      address: String,
      postalCode: String,
      phoneNumber: String,
      label: String, // e.g., 'Home', 'Work'
    }
  ],  
  lastLogin: {
    type: Date,
    default: null,
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'posts',
  }],
  paidPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'posts',  // Track the paid posts
  }],
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
  },
  verificationTokenExpires: {
    type: Date,
  },
});

// Hash password before saving (using bcrypt with a reasonable salt rounds)
// UserSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10); // Adjust salt rounds as needed

//   console.log("Password before hashing:", this.password);
//   this.password = await bcrypt.hash(this.password, salt);
//   console.log("Hashed password:", this.password);
//   next();
// });

const User = mongoose.model("users",UserSchema)
 module.exports = User;
