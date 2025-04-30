const mongoose = require('mongoose');

const groupChatMessageSchema = new mongoose.Schema({
  // groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'groups', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GroupChatMessage', groupChatMessageSchema);
