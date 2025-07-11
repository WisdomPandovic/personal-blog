const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  isPublic: { type: Boolean, default: true },
  color: { type: String, default: '#3b82f6' }, 
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
