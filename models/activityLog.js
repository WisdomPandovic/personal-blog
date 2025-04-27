const mongoose = require('mongoose');
const { Schema } = mongoose;

const activitySchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  action: { type: String, required: true },
  message: {
    type: String,
    required: true,
  },
  mentioned: {
    type: Boolean,
    default: false,
  },
  metadata: { type: Object },
}, { timestamps: true }); // timestamps auto-creates createdAt and updatedAt

module.exports = mongoose.model('Activity', activitySchema);
