const mongoose = require('mongoose');

const personalChatMessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PersonalChatMessage', personalChatMessageSchema);
