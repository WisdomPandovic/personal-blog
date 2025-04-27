const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate') // Assuming you already have this middleware
const Activity = require('../../models/activityLog'); // We'll create a simple Activity model
const mongoose = require('mongoose');

// @route   GET /api/activity-log
// @desc    Fetch user's activity logs
// @access  Private
router.get('/activity-log', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("User ID for activity log query:", userId);

    const activities = await Activity.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json({ activities });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

async function createActivity() {
    const activity = new Activity({
      user: new mongoose.Types.ObjectId('user_id_here'), // Use a valid user ID, instantiate correctly
      action: 'Profile image updated',
      message: 'User updated their profile image',
      mentioned: false,
      metadata: { profileImage: 'http://example.com/profile.jpg' }
    });
  
    await activity.save();
  }
  
  createActivity().catch(err => console.log(err));


module.exports = router;
