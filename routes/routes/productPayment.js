const express = require("express");
const axios = require("axios");
const router = express.Router();
const Order = require("../../models/order"); // Create an Order model
const User = require("../../models/user");

// Load environment variables
require("dotenv").config();

// POST route to initialize Paystack payment for products
router.post("/products/payment", async (req, res) => {
  const { amount, email, userId, cartItems } = req.body;

  if (!amount || !email || !userId || !cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "Invalid payment data." });
  }

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    
    // Store cart items in metadata
    const metadata = {
      userId,
      cartItems,
    };

    // Initialize Paystack payment
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Convert to kobo
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ authorization_url: response.data.data.authorization_url });
  } catch (err) {
    console.error("Error initializing payment:", err);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.get('/product/payment/verify/:reference', async (req, res) => {
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
  
//   router.get("/payment/callback", async (req, res) => {
//     const { trxref, reference } = req.query;
  
//     // If either trxref or reference is missing, return an error
//     if (!trxref || !reference) {
//         return res.status(400).json({ error: 'Invalid callback data' });
//       }
  
//     try {
//       const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  
//       // Verify payment with Paystack
//       const response = await axios.get(
//         `https://api.paystack.co/transaction/verify/${reference}`,
//         {
//           headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
//         }
//       );
  
//       const paymentData = response.data.data;
  
//       if (paymentData.status === "success") {
//         const { userId, cartItems } = paymentData.metadata;
  
//         // Save order to database
//         const newOrder = new Order({
//           userId,
//           items: cartItems,
//           totalAmount: paymentData.amount / 100, // Convert from kobo
//           paymentReference: reference,
//           status: "paid",
//         });
  
//         await newOrder.save();
  
//         // ✅ Redirect user to the order confirmation page
//         return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/order-confirmation/${newOrder._id}`);
//       } else {
//         return res.status(400).json({ success: false, message: "Payment verification failed." });
//       }
//     } catch (err) {
//       console.error("Error verifying payment:", err);
//       return res.status(500).json({ error: "Payment verification failed" });
//     }
//   });
  
router.get("/payment/callback", async (req, res) => {
    const { reference } = req.query;

    if (!reference) {
        return res.status(400).json({ error: "Invalid callback data" });
    }

    try {
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

        // Verify payment with Paystack
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
            }
        );

        const paymentData = response.data.data;

        if (paymentData.status === "success") {
            const { userId, cartItems, type, postId } = paymentData.metadata; // ✅ Extract postId 

            if (type === "product_purchase") {
                // Save order for product purchase
                const newOrder = new Order({
                    userId,
                    items: cartItems,
                    totalAmount: paymentData.amount / 100, // Convert from kobo
                    paymentReference: reference,
                    status: "paid",
                });

                await newOrder.save();

                // Redirect to order confirmation page
                return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/order-confirmation/${newOrder._id}`);
            } 
            else if (type === "blog_subscription" && postId) { // ✅ Ensure postId is present
                // Grant access to the post
                await Post.updateOne({ _id: postId }, { paid: true });

                await User.updateOne(
                    { _id: userId },
                    { $addToSet: { paidPosts: postId } } // Add postId to user's paidPosts array
                );

                // Redirect to the paid blog post
                return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/blog/${postId}`);
            } 
            else {
                // Unknown type, redirect to a generic success page
                return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/payment-success`);
            }
        } else {
            // If payment fails, redirect to failure page
            return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/payment-failed`);
        }
    } catch (err) {
        console.error("Error verifying payment:", err);
        return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/payment-failed`);
    }
});

module.exports = router;
