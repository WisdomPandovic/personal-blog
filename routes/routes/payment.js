const express = require('express');
const axios = require('axios');
const router = express.Router();
const Post = require("../../models/post");
const User = require("../../models/user");

// Load environment variables
require('dotenv').config();

// POST route to initialize Paystack payment
router.post('/payment', async (req, res) => {
  const { amount, email, postId, userId } = req.body;

  // Validate the request
  if (!amount || !email || !postId || !userId) {
    return res.status(400).json({ error: 'Amount, email, postId, and userId are required' });
  }

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // Initialize metadata object
    const metadata = { postId, userId };

    // Make a POST request to Paystack to initialize payment
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        postId,
        amount: amount * 100,  // Paystack expects the amount in kobo (100 kobo = 1 Naira)
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const authorization_url = response.data.data.authorization_url;

    res.status(200).json({ authorization_url });
  } catch (err) {
    console.error('Error initializing payment:', err);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// GET route to verify payment status
router.get('/payment/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // Make a GET request to Paystack to verify the payment using the reference
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// POST route for Paystack callback (payment success or failure)
// router.get('/payment/callback', async (req, res) => {
//   try {
//     const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
//     const { trxref, reference } = req.query;

//       // Access postId from metadata (found inside paymentData)
//       const postId = paymentData.metadata?.postId || 'defaultPostId';

//     if (!postId) {
//       console.error('Post ID is missing or invalid');
//       return res.status(400).json({ error: 'Post ID is missing from metadata' });
//     }

//     // If either trxref or reference is missing, return an error
//     if (!trxref || !reference) {
//       return res.status(400).json({ error: 'Invalid callback data' });
//     }

//     // Log incoming request for debugging
//     console.log('Callback Query:', req.query);
//     console.log('PostId from metadata:', postId);

//     // Verify the payment using Paystack's verify endpoint
//     const response = await axios.get(
//       `https://api.paystack.co/transaction/verify/${reference}`,
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//         },
//       }
//     );

//     const paymentData = response.data.data;

//     // Check if payment was successful
//     if (paymentData.status === 'success') {
//       console.log('Payment verified successfully:', paymentData);

//       // Redirect to the post page
//       res.redirect(`http://localhost:3000/blog/${postId}`);
//       return; // Ensure no further code runs after redirect

//     } else {
//       console.error('Payment verification failed:', paymentData);
//       return res.status(400).json({ error: 'Payment verification failed' });
//     }
//   } catch (err) {
//     console.error('Error handling payment callback:', err.message, err);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

router.get('/payment/callback', async (req, res) => {
  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    const { trxref, reference } = req.query;

    // If either trxref or reference is missing, return an error
    if (!trxref || !reference) {
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    // Log incoming request for debugging
    console.log('Callback Query:', req.query);

    // Verify the payment using Paystack's verify endpoint
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = response.data.data;

    // Ensure postId is available in metadata
    const postId = paymentData.metadata?.postId || 'defaultPostId'; // Access postId from metadata
    const userId = paymentData.metadata?.userId; // Access userId from metadata

    if (!postId) {
      console.error('Post ID is missing or invalid');
      return res.status(400).json({ error: 'Post ID is missing from metadata' });
    }

    // Check if payment was successful
    if (paymentData.status === 'success') {
      console.log('Payment verified successfully:', paymentData);

      // Update the post as paid in the PostModel
      await Post.updateOne({ _id: postId }, { paid: true });

      await User.updateOne(
        { _id: userId },
        { $addToSet: { paidPosts: postId } } // Add postId to the user's paidPosts array
      );

      // Redirect to the post page
      res.redirect(`https://chilla-sweella-personal-blog.vercel.app/blog/${postId}`);
      return; // Ensure no further code runs after redirect

    } else {
      console.error('Payment verification failed:', paymentData);
      return res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (err) {
    console.error('Error handling payment callback:', err.message, err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/payment/status", async (req, res) => {
  const { reference, postId, userId } = req.body; // Payment reference, postId, and userId from the client

  // Validate request parameters
  if (!postId || !userId) {
    return res.status(400).json({ error: "Post ID and User ID are required." });
  }

  try {
    // Check if the user exists and if the post has already been paid for
    const user = await User.findById(userId); // Assuming a Mongoose model `User`
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if the post is already in the user's `paidPosts`
    const hasPaidForPost = user.paidPosts.some(
      (paidPostId) => paidPostId.toString() === postId
    );

    if (hasPaidForPost) {
      const postUrl = `https://chilla-sweella-personal-blog.vercel.app/blog/${postId}`; // Construct full post detail URL
      return res.status(200).json({
        success: true,
        message: "User has already paid for this post.",
        postUrl: postUrl,
      });
    }

    // If no reference is provided and the user has not paid, return a "not paid" response
    if (!reference) {
      return res.status(200).json({
        success: false,
        message: "User has not paid for this post.",
      });
    }

    // Verify the payment with Paystack
    const PAYSTACK_URL = `https://api.paystack.co/transaction/verify/${reference}`;
    const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    const response = await axios.get(PAYSTACK_URL, {
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    });

    const data = response.data;

    if (data.status && data.data.status === "success") {
      const postIdFromMetadata = data.data.metadata?.postId;

      if (postIdFromMetadata !== postId) {
        return res.status(400).json({
          success: false,
          message: "Post ID does not match with the payment metadata.",
        });
      }

      // Add the paid post to the user's `paidPosts`
      user.paidPosts.push(postId);
      await user.save();

      const postUrl = `https://chilla-sweella-personal-blog.vercel.app/blog/${postId}`; // Construct full post detail URL
      return res.status(200).json({
        success: true,
        message: "Payment verified successfully.",
        postUrl: postUrl,
        data: data.data,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
        data: data.data,
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while verifying payment.",
    });
  }
});



module.exports = router;