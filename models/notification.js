const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { type: String, required: true, enum: ['info', 'warning', 'error', 'success'] }, // optional: enforce known types
  timestamp: { type: Date, default: Date.now },
});

const Notification = mongoose.model('Notification', NotificationSchema); // Capital "N" is conventional for model names

module.exports = Notification;
