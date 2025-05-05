const Subscription = require('../../models/subscription');
const sendConfirmationEmail = require("../../utils/emailService");
const express = require('express');
const router = express.Router();
const User = require("../../models/user");
const Notification = require("../../models/notification");

router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  try {
    // Validate input
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Check if the email is already subscribed
    const existingSubscription = await Subscription.findOne({ email });

    if (existingSubscription) {
      return res.status(400).json({ message: 'This email is already subscribed' });
    }

    // Create a new subscription
    const newSubscription = new Subscription({ email });
    await newSubscription.save();

    // 🛎 Create an admin notification
    try {
      const user = await User.findOne({ email });// Fetch user info

      const userName = user?.username || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "A user"; // Adjust based on your User model fields

      const notificationMessage = `${userName} has subscribed to the newsletter.`; // 🛎 The message shown to admin

      const newNotification = new Notification({
        message: notificationMessage,
        type: "subscription", // You can use 'payment' or 'order'
      });

      await newNotification.save();
      console.log('🔔 Admin notification created successfully');
    } catch (notificationError) {
      console.error('Error creating admin notification:', notificationError);
    }

    // Send a confirmation email
    const emailSubject = 'Subscription Confirmed – Camila Aguila Newsletter';
    //    const emailText = `Hello,\n\nThank you for subscribing to our newsletter. You will now receive our weekly newsletter.\n\nBest regards,\nTCmila Aguila Team`;
    const emailHtml = `
       <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
         <h2 style="color: #444;">Hello,</h2>
         <p>Thank you for subscribing to our newsletter</p>
         <p>You will now receive our weekly newsletter.</p>
         <br/>
         <p>Best regards,</p>
         <p><strong>The Camila Aguila Team</strong></p>
       </div>
     `;

    try {
      await sendConfirmationEmail(email, emailSubject, emailHtml);
      console.log('Confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }

    res.status(201).json({ message: 'Successfully subscribed!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

router.get('/subscribers', async (req, res) => {
  try {
    let subscription = await Subscription.find().lean();
    res.json(subscription);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get('/unsubscribe', async (req, res) => {
  const { email } = req.query;

  try {
    const result = await Subscription.findOneAndDelete({ email });
    if (!result) {
      return res.status(404).json({ message: "Email not found." });
    }

    res.send("You've been unsubscribed successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error unsubscribing" });
  }
});

module.exports = router;
