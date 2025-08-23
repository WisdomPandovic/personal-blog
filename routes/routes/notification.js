const express = require('express');
const Notification = require('../../models/notification');
const router = express.Router();

// GET /api/notifications - List notifications (paginated)
// router.get('/notification', async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const notifications = await Notification.find()
//       .sort({ timestamp: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit);

//     const totalNotifications = await Notification.countDocuments();

//     res.json({
//       success: true,
//       data: notifications,
//       total: totalNotifications,
//       currentPage: page,
//       totalPages: Math.ceil(totalNotifications / limit),
//     });
//   } catch (error) {
//     console.error('Error fetching notifications:', error);
//     res.status(500).json({ success: false, error: 'Internal Server Error' });
//   }
// });

router.get('/notification', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 👇 Assume `req.user` is set by your auth middleware (with { _id, role })
    const userRole = req.user?.role || "user"; 
    const userId = req.user?._id;

    let filter = { audience: "all" };

    if (userRole === "admin") {
      // Admin can see "all" + "admin"
      filter = { $or: [{ audience: "all" }, { audience: "admin" }] };
    } else {
      // Normal user can see "all" + "user" + ones specifically for them
      filter = { 
        $or: [
          { audience: "all" }, 
          { audience: "user" }, 
          { userId: userId } 
        ]
      };
    }

    const notifications = await Notification.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalNotifications = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: notifications,
      total: totalNotifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


// POST /api/notifications - Create a new notification
router.post('/notification', async (req, res) => {
  try {
    const { message, type } = req.body;

    if (!message || !type) {
      return res.status(400).json({ success: false, error: 'Message and type are required.' });
    }

    const newNotification = new Notification({ message, type });
    await newNotification.save();

    res.status(201).json({ success: true, data: newNotification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/notification/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


module.exports = router;
