require('dotenv').config();

const Event = require('../../models/event');
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const isAdmin = require('../../middleware/admin');

// Get all events (public or created by the requesting admin)
router.get("/events", authenticate, async (req, res) => {
    const events = await Event.find({
      $or: [
        { isPublic: true },
        { createdBy: req.user._id }
      ]
    });
    res.json(events);
  });
  
  // Create an event
  router.post("/events", authenticate, isAdmin, async (req, res) => {
    const { title, description, start, end, isPublic } = req.body;
    const event = await Event.create({
      title,
      description,
      start,
      end,
      isPublic,
      createdBy: req.user._id
    });
    res.status(201).json(event);
  });
  
  module.exports = router;