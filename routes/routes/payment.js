const express = require('express');
const axios = require('axios');
const router = express.Router();
const Post = require("../../models/post");
const User = require("../../models/user");
const Order = require("../../models/order"); 

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
    const metadata = { postId, userId, type: "blog_subscription", };

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

router.post("/products/payment", async (req, res) => {
  console.log("🔍 Incoming Request Body:", req.body);
  const { amount, email, userId, cartItems, deliveryMethod, deliveryFee, address, postalCode, phoneNumber } = req.body;

  if (!amount || !email || !userId || !cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "Invalid payment data." });
  }

  if (!phoneNumber || !deliveryMethod) {
    return res.status(400).json({ error: "Phone number and delivery method are required." });
}

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    const totalAmount = deliveryMethod === "delivery" ? amount + deliveryFee : amount;

    // Store cart items in metadata
    const metadata = {
      userId,
      cartItems,
      type: "product_purchase",
      deliveryMethod,
      ...(deliveryMethod === "delivery" && { 
        address, 
        postalCode, 
        phoneNumber, 
        deliveryFee 
      })
    };

    console.log("Received Order Data:", req.body);
    console.log("Metadata being sent to Paystack:", metadata);

    // Initialize Paystack payment
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: totalAmount * 100, // Convert to kobo
        metadata: JSON.stringify(metadata),
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Paystack Response:", response.data); 

    res.status(200).json({ authorization_url: response.data.data.authorization_url });
  } catch (err) {
    console.error("Error initializing payment:", err);
    res.status(500).json({ error: "Payment initialization failed" });
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

    // Ensure postId is available in metadata
    const postId = paymentData.metadata?.postId || 'defaultPostId'; // Access postId from metadata
    const userId = paymentData.metadata?.userId; // Access userId from metadata

    if (!postId) {
      console.error('Post ID is missing or invalid');
      return res.status(400).json({ error: 'Post ID is missing from metadata' });
    }

    if (paymentData.status === "success") {
      const { cartItems, type} = paymentData.metadata; // ✅ Extract postId 

      if (type === "product_purchase") {
        // Save order for product purchase
        const newOrder = new Order({
          userId,
          items: cartItems,
          totalAmount: paymentData.amount / 100, // Convert from kobo
          deliveryMethod: metadata.deliveryMethod, // Ensure delivery method is stored
          deliveryFee: metadata.deliveryFee || 0, // Default to 0 if not provided
          address: metadata.address || null, 
          postalCode: metadata.postalCode || null, 
          phoneNumber: metadata.phoneNumber, 
          paymentReference: reference,
          status: "paid",
        });        

        await newOrder.save();

        // Redirect to order confirmation page
        return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/order-confirmation/${newOrder._id}`);
      }
      else if (type === "blog_subscription") { 
         // Update the post as paid in the PostModel
        await Post.updateOne({ _id: postId }, { paid: true });

        await User.updateOne(
          { _id: userId },
          { $addToSet: { paidPosts: postId } } // Add postId to the user's paidPosts array
        );

        // Redirect to the post page
        res.redirect(`https://chilla-sweella-personal-blog.vercel.app/blog/${postId}`);
        return; // Ensure no further code runs after redirect
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

// GET order details by orderId
router.get("/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ order });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/webhook/paystack", async (req, res) => {
  console.log("🔹 FULL PAYSTACK WEBHOOK DATA:", JSON.stringify(req.body, null, 2));

  const { data } = req.body;
  if (!data) {
      console.error("❌ Error: No `data` object found in webhook.");
      return res.status(400).json({ error: "Invalid webhook data" });
  }

  const { metadata, reference, status } = data;
  
  console.log("✅ Extracted Metadata:", metadata);

  if (!metadata || !metadata.phoneNumber || !metadata.deliveryMethod) {
      console.error("❌ Metadata is missing required fields.");
      return res.status(400).json({ error: "Missing required fields in metadata" });
  }

  try {
      const newOrder = new Order({
          userId: metadata.userId,
          items: metadata.cartItems,
          totalAmount: data.amount / 100, // Convert from kobo to Naira
          deliveryMethod: metadata.deliveryMethod,
          address: metadata.address,
          postalCode: metadata.postalCode,
          phoneNumber: metadata.phoneNumber,
          deliveryFee: metadata.deliveryFee,
          paymentReference: reference,
          status,
      });

      console.log("✅ Saving Order:", newOrder);
      await newOrder.save();
      res.status(201).json({ message: "Order saved successfully." });
  } catch (error) {
      console.error("❌ Error saving order:", error);
      res.status(500).json({ error: "Error saving order" });
  }
});

module.exports = router;
