const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { type: String, required: true }, // optional: enforce known types
  timestamp: { type: Date, default: Date.now },

    // 🔑 New fields
    audience: {
      type: String,
      enum: ["admin", "user", "all"], 
      default: "all"
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: false
    }
});

const Notification = mongoose.model('Notification', NotificationSchema); // Capital "N" is conventional for model names

module.exports = Notification;
