const express = require('express');
const Notification = require('../../models/notification');
const router = express.Router();

// GET /api/notifications - List notifications (paginated)
// router.get('/notifications', async (req, res) => {
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

// router.get('/notification', async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const userRole = req.user?.role || "user"; 
//     const userId = req.user?._id;

//     let filter;

//     if (userRole === "admin") {
//       // ✅ Admin sees everything
//       filter = { $or: [{ audience: "all" }, { audience: "admin" }] };
//     } else {
//       // ✅ Users should NOT see "payment" notifications where audience=all
//       filter = {
//         $or: [
//           { audience: "user" },
//           { userId: userId },
//           { 
//             audience: "all", 
//             type: { $ne: "payment" } // 🚫 block payment+all combo
//           }
//         ]
//       };
//     }

//     const notifications = await Notification.find(filter)
//       .sort({ timestamp: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit);

//     const totalNotifications = await Notification.countDocuments(filter);

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


// ✅ Admin: see ALL notifications
router.get('/notifications', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const userRole = req.user?.role || "user";
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const notifications = await Notification.find()
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalNotifications = await Notification.countDocuments();

    res.json({
      success: true,
      data: notifications,
      total: totalNotifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});


// ✅ User: see only theirs + general "user/all" (excluding payment+all)
router.get('/notification', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const userRole = req.user?.roleName || req.headers["x-user-role"] || "user";
    const userId = req.user?._id || req.headers["x-user-id"];

    let filter;

    if (userRole === "admin") {
      filter = { $or: [{ audience: "all" }, { audience: "admin" }] };
    } else {
      filter = {
        $or: [
          { audience: "user" },
          { userId: userId },
          { audience: "all", type: { $ne: "payment" } }
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
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
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

// router.post("/admin/fix-notifications", async (req, res) => {
//   try {
//     const result = await Notification.updateMany(
//       { 
//         type: "payment", 
//         audience: { $regex: /^all$/i }  // ✅ catches "all", "ALL", " all ", etc
//       },
//       { $set: { audience: "admin" } }
//     );
//     const sample = await Notification.find({ type: "payment" }).limit(5);
//     console.log("Sample payment notifications:", sample);
    
//     res.json({ 
//       success: true, 
//       matched: result.matchedCount, 
//       updated: result.modifiedCount 
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });



module.exports = router;
