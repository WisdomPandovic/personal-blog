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

// GET route to verify product payment
// router.get("/productpayment/verify/:reference", async (req, res) => {
//   const { reference } = req.params;

//   try {
//     const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

//     // Verify payment with Paystack
//     const response = await axios.get(
//       `https://api.paystack.co/transaction/verify/${reference}`,
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//         },
//       }
//     );

//     const paymentData = response.data.data;

//     if (paymentData.status === "success") {
//       const { userId, cartItems } = paymentData.metadata;

//       // Save order to database
//       const newOrder = new Order({
//         userId,
//         items: cartItems,
//         totalAmount: paymentData.amount / 100, // Convert from kobo
//         paymentReference: reference,
//         status: "paid",
//       });

//       await newOrder.save();

//     //   res.status(200).json({ success: true, message: "Payment successful.", order: newOrder });
//       res.status(200).json({
//         success: true,
//         message: "Payment successful.",
//         orderId: newOrder._id, // Send order ID to frontend
//     });
//     } else {
//       res.status(400).json({ success: false, message: "Payment verification failed." });
//     }
//   } catch (err) {
//     console.error("Error verifying payment:", err);
//     res.status(500).json({ error: "Payment verification failed" });
//   }
// });

router.get("/product/payment/verify/:reference", async (req, res) => {
    const { reference } = req.params;
  
    try {
      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  
      // Verify payment with Paystack
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );
  
      const paymentData = response.data.data;
  
      if (paymentData.status === "success") {
        const { userId, cartItems } = paymentData.metadata;
  
        // Save order to database
        const newOrder = new Order({
          userId,
          items: cartItems,
          totalAmount: paymentData.amount / 100, // Convert from kobo
          paymentReference: reference,
          status: "paid",
        });
  
        await newOrder.save();
  
        // Redirect the user to the order confirmation page
        return res.redirect(`https://personal-blog-giw8.onrender.com/order-confirmation/${newOrder._id}`);
      } else {
        return res.status(400).json({ success: false, message: "Payment verification failed." });
      }
    } catch (err) {
      console.error("Error verifying payment:", err);
      return res.status(500).json({ error: "Payment verification failed" });
    }
  });
  

module.exports = router;
