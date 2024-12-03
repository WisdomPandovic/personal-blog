// const express = require('express');
// const axios = require('axios');
// const router = express.Router();

// // Load environment variables
// require('dotenv').config();

// // POST route to initialize Paystack payment
// router.post('/payment', async (req, res) => {
//   const { amount, email } = req.body;

//   // Validate the request
//   if (!amount || !email) {
//     return res.status(400).json({ error: 'Amount and email are required' });
//   }

//   try {
//     // Paystack API secret key
//     const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

//     // Make a POST request to Paystack to initialize payment
//     const response = await axios.post(
//       'https://api.paystack.co/transaction/initialize',
//       {
//         email,
//         amount: amount * 100,  // Paystack expects the amount in kobo (100 kobo = 1 Naira)
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//           'Content-Type': 'application/json',
//         },
//       }
//     );

//     // Extract the authorization URL from Paystack response
//     const authorization_url = response.data.data.authorization_url;

//     // Send the authorization URL back to the frontend
//     res.status(200).json({ authorization_url });
//   } catch (err) {
//     console.error('Error initializing payment:', err);
//     res.status(500).json({ error: 'Payment initialization failed' });
//   }
// });

// // GET route to verify payment status (optional, for checking after payment)
// router.get('/payment/verify/:reference', async (req, res) => {
//   const { reference } = req.params;

//   try {
//     const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

//     // Make a GET request to Paystack to verify the payment using the reference
//     const response = await axios.get(
//       `https://api.paystack.co/transaction/verify/${reference}`,
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//         },
//       }
//     );

//     // Return the verification response
//     res.status(200).json(response.data);
//   } catch (err) {
//     console.error('Error verifying payment:', err);
//     res.status(500).json({ error: 'Payment verification failed' });
//   }
// });

// router.post('/payment/callback', async (req, res) => {
//     const { reference, status } = req.body;  // Paystack callback data
    
//     if (status === 'success') {
//         // Verify payment by checking with Paystack API
//         const transaction = await verifyTransaction(reference); // Make API request to Paystack

//         if (transaction.status === 'success') {
//             // Fetch post details based on transaction information
//             const postId = transaction.data.metadata.postId;  // Assuming metadata holds postId
//             // Redirect user to the post details page
//             return res.redirect(`/blog/${blogId}`);
//         } else {
//             // Payment verification failed, show error
//             return res.status(400).send("Payment verification failed");
//         }
//     } else {
//         // Payment failed, notify user
//         return res.status(400).send("Payment failed");
//     }
// });


// module.exports = router;

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

    // Make a POST request to Paystack to initialize payment
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        postId,
        amount: amount * 100,  // Paystack expects the amount in kobo (100 kobo = 1 Naira)
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
router.post('/payment/callback', async (req, res) => {
  const { reference, status } = req.body;  // Paystack callback data

  if (status === 'success') {
    try {
      // Verify payment by checking with Paystack API
      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (response.data.data.status === 'success') {
        const postId = response.data.data.metadata.postId;  // Assuming metadata holds postId
        // Redirect user to the post details page
        return res.redirect(`/blog/${postId}`);
      } else {
        return res.status(400).send("Payment verification failed");
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      return res.status(500).send("Error verifying payment");
    }
  } else {
    // Payment failed, notify user
    return res.status(400).send("Payment failed");
  }
});

router.get('/payment/callback', (req, res) => {
    res.send("Webhook is accessible!");
  });
  

module.exports = router;

