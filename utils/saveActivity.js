// utils/saveActivity.js
const Activity = require('../models/activityLog');

const saveActivity = async ({ userId, action, message, mentioned = false, metadata = {} }) => {
  try {
    const newActivity = new Activity({
      user: userId,
      action,
      message,
      mentioned,
      metadata, // optional extra data like postId, commentId etc.
    });

    await newActivity.save();
    console.log("Activity saved successfully");
  } catch (error) {
    console.error('Error saving activity:', error.message);
  }
};

module.exports = saveActivity;
