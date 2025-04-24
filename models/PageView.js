const mongoose = require('mongoose');

const PageViewSchema = new mongoose.Schema({
  pageUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', // reference to the User model
    required: false, // anonymous users may not have userId
  },
  ipAddress: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const PageView = mongoose.model('pageviews', PageViewSchema);

module.exports = PageView;
