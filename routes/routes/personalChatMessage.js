const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate')
const isAdmin = require('../../middleware/admin');
const PersonalChatMessage = require('../../models/personalChatMessage');
const GroupChatMessage = require('../../models/groupChatMessage');
const User = require('../../models/user');

// Send (save) a personal chat message
router.post('/personal-chat/send', async (req, res) => {
  try {
    const { from, to, content } = req.body;

    if (!from || !to || !content) {
      return res.status(400).json({ error: 'From, To, and Content are required' });
    }

    const newMessage = new PersonalChatMessage({
      from,
      to,
      content,
    });

    await newMessage.save();

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Failed to send personal chat message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch personal chat messages between two users
router.get('/personal-chat/messages/:user1/:user2', async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const messages = await PersonalChatMessage.find({
      $or: [
        { from: user1, to: user2 },
        { from: user2, to: user1 }
      ]
    })
      .populate('from', 'username role profileImage')
      .populate('to', 'username role profileImage')
      .sort({ timestamp: 1 });

    const formattedMessages = messages.map(msg => ({
      sender: {
        _id: msg.from._id,
        username: msg.from.username,
        role: msg.from.role,
        profileImage: msg.from.profileImage, 
      },
      receiver: {
        _id: msg.from._id,
        username: msg.to.username,
        role: msg.to.role,
        profileImage: msg.from.profileImage, 
      },
      content: msg.content,
      timestamp: msg.timestamp,
    }));

    res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('Failed to fetch personal chat messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/clear-all-chats', authenticate, isAdmin, async (req, res) => {
  try {
    const groupResult = await GroupChatMessage.deleteMany({});
    const personalResult = await PersonalChatMessage.deleteMany({});

    res.json({
      success: true,
      message: `Deleted ${groupResult.deletedCount} group messages and ${personalResult.deletedCount} personal messages.`,
    });
  } catch (err) {
    console.error('Error clearing chats:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
