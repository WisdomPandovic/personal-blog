const express = require('express');
const axios = require('axios');
const router = express.Router();

// Load environment variables
require('dotenv').config();

// POST route to initialize Paystack payment
router.post('/payment', async (req, res) => {
  const { amount, email, postId } = req.body;

  // Validate the request
  if (!amount || !email || !postId) {
    return res.status(400).json({ error: 'Amount and email are required' });
  }

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // Initialize metadata object
    const metadata = { postId };

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

//     // Ensure postId is passed in metadata
//     const postId = metadata ? JSON.parse(metadata).postId : 'defaultPostId'; // Parse the metadata query parameter
//     // const postId = req.body.metadata?.postId || 'defaultPostId';

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
    const { trxref, reference, metadata } = req.query;

    // Ensure metadata exists and parse it
    let postId = 'defaultPostId'; // Default postId

    if (metadata) {
      try {
        const parsedMetadata = JSON.parse(metadata);
        postId = parsedMetadata.postId || postId;  // Use postId from metadata, fallback to default
      } catch (err) {
        console.error('Error parsing metadata:', err);
        return res.status(400).json({ error: 'Invalid metadata format' });
      }
    }

    console.log('Post ID from metadata:', postId);

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

    // Check if payment was successful
    if (paymentData.status === 'success') {
      console.log('Payment verified successfully:', paymentData);

      // Redirect to the post page
      res.redirect(`http://localhost:3000/blog/${postId}`);
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


module.exports = router;