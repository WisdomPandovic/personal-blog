const express = require('express');
const router = express.Router();
const Review = require('../../models/review'); // Import the review model

// POST route to submit a review message
router.post('/review', async (req, res) => {
  const { fullName, message } = req.body;

  // Check if all required fields are provided
  if (!fullName || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Create a new review message
    const newReview = new Review({
      fullName,
      message
    });

    // Save the review message to the database
    await newReview.save();
    
    res.status(201).json({ message: 'Your message has been sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong, please try again later' });
  }
});

// GET route to fetch all review messages (Optional: for admin use)
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find(); // Fetch all review messages
    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch review messages' });
  }
});

module.exports = router;
