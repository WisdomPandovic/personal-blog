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
    const { title, description, start, end, isPublic, color } = req.body;
    const event = await Event.create({
      title,
      description,
      start,
      end,
      isPublic,
      color,  
      createdBy: req.user._id
    });
    res.status(201).json(event);
  });

  // PATCH /events/:id — update an event
router.patch('/events/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { title, description, start, end, isPublic, color } = req.body;
  
    try {
      // 1. Find the event
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found.' });
      }
  
      // 2. Authorize: only creator can edit
      if (event.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You do not have permission to edit this event.' });
      }

      if (color !== undefined) event.color = color; 
  
      // 3. Apply updates
      if (title !== undefined)       event.title = title;
      if (description !== undefined) event.description = description;
      if (start !== undefined)       event.start = start;
      if (end !== undefined)         event.end = end;
      if (isPublic !== undefined)    event.isPublic = isPublic;
  
      // 4. Save and return
      const updated = await event.save();
      res.json(updated);
    } catch (err) {
      console.error('Error updating event:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  });  
  
  module.exports = router;


