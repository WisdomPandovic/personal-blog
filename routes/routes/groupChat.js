const express = require('express');
const router = express.Router();
const GroupChatMessage = require('../../models/groupChatMessage');
const User = require('../../models/user');

// Fetch previous group chat messages
router.get('/group-chat/messages', async (req, res) => {
  try {
    const messages = await GroupChatMessage.find()
      .populate('sender', 'username role profileImage')
      .sort({ timestamp: 1 });

    const formattedMessages = messages.map(msg => ({
      sender: {
        username: msg.sender.username,
        role: msg.sender.role,
        profileImage: msg.sender.profileImage,
      },
      content: msg.content,
      timestamp: msg.timestamp,
    }));

    res.json({ messages: formattedMessages });
  } catch (err) {
    console.error('Failed to fetch group chat messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// router.get('/group-chat/messages/:groupId', async (req, res) => {
//   try {
//     const { groupId } = req.params;

//     const messages = await GroupChatMessage.find({ groupId })
//       .populate('sender', 'username role profileImage')
//       .sort({ timestamp: 1 });

//     const formattedMessages = messages.map(msg => ({
//       sender: {
//         username: msg.sender.username,
//         role: msg.sender.role,
//         profileImage: msg.sender.profileImage,
//       },
//       content: msg.content,
//       timestamp: msg.timestamp,
//     }));

//     res.json({ messages: formattedMessages });
//   } catch (err) {
//     console.error('Failed to fetch group chat messages:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// Send (save) a new group chat message


// router.post('/group-chat/send', async (req, res) => {
//   try {
//     const { groupId, senderId, content } = req.body;

//     if (!groupId || !senderId || !content) {
//       return res.status(400).json({ error: 'Group ID, Sender ID and content are required' });
//     }

//     // Create a new message
//     const newMessage = new GroupChatMessage({
//       groupId,
//       sender: senderId,
//       content,
//     });

//     await newMessage.save();

//     res.status(201).json({ message: 'Message sent successfully' });
//   } catch (err) {
//     console.error('Failed to send group chat message:', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

router.post('/group-chat/send', async (req, res) => {
  try {
    const { senderId, content } = req.body;

    if ( !senderId || !content) {
      return res.status(400).json({ error: 'Group ID, Sender ID and content are required' });
    }

    // Create a new message
    const newMessage = new GroupChatMessage({

      sender: senderId,
      content,
    });

    await newMessage.save();

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Failed to send group chat message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
