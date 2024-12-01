const Subscription = require('../../models/subscription');
const express = require('express');
const router = express.Router();

router.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the email is already subscribed
        const existingSubscription = await Subscription.findOne({ email });

        if (existingSubscription) {
            return res.status(400).json({ message: 'This email is already subscribed' });
        }

        // Create a new subscription
        const newSubscription = new Subscription({ email });
        await newSubscription.save();

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

module.exports = router;
