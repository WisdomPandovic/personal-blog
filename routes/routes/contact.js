const express = require('express');
const router = express.Router();
const Contact = require('../../models/contact'); // Import the Contact model

// POST route to submit a contact message
router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;

  // Check if all required fields are provided
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Create a new contact message
    const newContact = new Contact({
      name,
      email,
      message
    });

    // Save the contact message to the database
    await newContact.save();
    
    res.status(201).json({ message: 'Your message has been sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong, please try again later' });
  }
});

// GET route to fetch all contact messages (Optional: for admin use)
router.get('/contact', async (req, res) => {
  try {
    const contacts = await Contact.find(); // Fetch all contact messages
    res.status(200).json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

module.exports = router;
