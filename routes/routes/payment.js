const express = require('express');
const mongoose = require("mongoose");
const axios = require('axios');
const router = express.Router();
const authenticate = require('../../middleware/authenticate')
const authorizeRoles = require('../../middleware/authorize')
const isAdmin = require('../../middleware/admin');
const Post = require("../../models/post");
const Product = require("../../models/product");
const User = require("../../models/user");
const Order = require("../../models/order");
const Notification = require("../../models/notification");
const Transaction = require("../../models/transaction");
const sendConfirmationEmail = require("../../utils/emailService");
const { saveOrderFromPaymentData } = require("../../helpers/paymentHandlers");

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

    // Fetch the post by postId to get the title
    const post = await Post.findById(postId).lean(); // Fetch post by ID
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postTitle = post.title; // Get the post title from the fetched post

    // Initialize metadata object
    const metadata = { email, postId, userId, type: "blog_subscription", };

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

    // Send a confirmation email
    const emailSubject = `Subscription Confirmation for: ${postTitle}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
        <h2 style="color: #444;">Hello,</h2>
        <p>Your access to <strong>"${postTitle}"</strong> has been successfully confirmed.</p>
        <p>Thank you for subscribing to this post!</p>
        <p>You will be redirected to the post details page shortly after your payment is verified.</p>
        <p>If you have any questions, feel free to reach out to us at any time.</p>
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

    res.status(200).json({ authorization_url });
  } catch (err) {
    console.error('Error initializing payment:', err);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

router.post("/products/payment", async (req, res) => {
  console.log("🔍 Incoming Request Body:", req.body);
  const { amount, email, userId, cartItems, deliveryMethod, deliveryFee, country, countryCode, address, postalCode, phoneNumber } = req.body;

  if (!amount || !email || !userId || !cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "Invalid payment data." });
  }

  // ✅ Validate stock — but don't reduce yet
  for (let item of cartItems) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ error: `Product not found: ${item.productId}` });
    }

    if (!item.preorder) {
      const colorVariant = product.color.find(c => c.color === item.selectedColor);
      if (!colorVariant || colorVariant.stock < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${item.title} (${item.selectedColor}).`
        });
      }
    }
  }

  if (!deliveryMethod) {
    return res.status(400).json({ error: "Delivery method is required." });
  }

  if (deliveryMethod === "delivery" && !phoneNumber) {
    return res.status(400).json({ error: "Phone number is required for delivery." });
  }

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    const totalAmount = deliveryMethod === "delivery" ? amount + deliveryFee : amount;

    // ✅ Prepare metadata (no stock reduction yet)
    const metadata = {
      userId,
      email,
      cartItems: cartItems.map(item => ({
        productId: item.productId,
        title: item.title,
        image: encodeURIComponent(item.image),
        price: item.price,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        category: item.category,
        preorder: item.preorder
      })),
      type: "product_purchase",
      deliveryMethod,
      ...(deliveryMethod === "delivery" && {
        country,
        countryCode,
        address,
        postalCode,
        phoneNumber,
        deliveryFee
      })
    };

    console.log("Received Order Data:", req.body);
    console.log("Metadata being sent to Paystack:", metadata);

    // ✅ Initialize Paystack payment
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: totalAmount * 100,
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

    // ✅ Save transaction as PENDING
    const transactionData = {
      userId,
      reference: response.data.data.reference,
      amount: totalAmount,
      status: "pending",
      channel: response.data.data.channel,
      currency: response.data.data.currency,
      metadata: metadata,
      gatewayResponse: response.data.message,
      paymentMethod: "Paystack",
    };

    const transaction = new Transaction(transactionData);
    await transaction.save();
    console.log("Transaction saved to database:", transaction);

    // ✅ Save delivery address (if delivery)
    if (deliveryMethod === "delivery") {
      const user = await User.findById(userId);
      if (user) {
        const addressExists = user.savedAddresses.some(addr =>
          addr.country === country &&
          addr.countryCode === countryCode &&
          addr.address === address &&
          addr.postalCode === postalCode &&
          addr.phoneNumber === phoneNumber
        );

        if (!addressExists) {
          user.savedAddresses.push({
            country,
            countryCode,
            address,
            postalCode,
            phoneNumber,
            label: "Home",
          });
          await user.save();
          console.log("📦 Address saved to user's profile.");
        }
      }
    }

    // ✅ Return only the URL — NO EMAIL, NO STOCK REDUCTION
    res.status(200).json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference
    });

  } catch (err) {
    console.error("Error initializing payment:", err);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

router.get('/payment/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // ✅ 1. Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;

    // ✅ 2. Confirm payment succeeded
    if (data.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment not successful",
        status: data.status
      });
    }

    // ✅ 3. Parse metadata
    let metadata = data.metadata;
    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        return res.status(400).json({ error: "Invalid metadata format" });
      }
    }

    const { userId, email, cartItems, deliveryMethod } = metadata;

    // ✅ 4. Prevent duplicate processing
    const existingOrder = await Order.findOne({ paymentReference: reference });
    if (existingOrder) {
      return res.redirect(`/order/${existingOrder._id}`);
    }

    // ✅ 5. Create the Order
    const order = new Order({
      userId,
      email,
      cartItems,
      deliveryMethod,
      address: metadata.address,
      phoneNumber: metadata.phoneNumber,
      country: metadata.country,
      countryCode: metadata.countryCode,
      postalCode: metadata.postalCode,
      deliveryFee: metadata.deliveryFee || 0,
      totalAmount: data.amount / 100, // kobo to naira
      paymentReference: reference,
      status: "paid",
      paidAt: new Date(),
    });

    await order.save();
    console.log("✅ Order created:", order._id);

    // ✅ 6. Reduce stock (skip for preorder)
    for (const item of cartItems) {
      if (item.preorder) continue;

      const product = await Product.findById(item.productId);
      if (!product) continue;

      const colorVariant = product.color.find(c => c.color === item.selectedColor);
      if (colorVariant && colorVariant.stock >= item.quantity) {
        colorVariant.stock -= item.quantity;
        await product.save();
        console.log(`📦 Stock reduced for ${item.title} (${item.selectedColor})`);
      }
    }

    // ✅ 7. Update transaction status
    await Transaction.findOneAndUpdate(
      { reference },
      { status: "success", paidAt: new Date() }
    );

    // ✅ 8. Save address to user (if delivery)
    if (deliveryMethod === "delivery" && userId) {
      const user = await User.findById(userId);
      if (user) {
        const exists = user.savedAddresses.some(addr =>
          addr.address === metadata.address &&
          addr.phoneNumber === metadata.phoneNumber
        );

        if (!exists) {
          user.savedAddresses.push({
            country: metadata.country,
            countryCode: metadata.countryCode,
            address: metadata.address,
            postalCode: metadata.postalCode,
            phoneNumber: metadata.phoneNumber,
            label: "Home",
          });
          await user.save();
        }
      }
    }

    // ✅ 9. Notify admin
    try {
      const user = await User.findById(userId);
      const userName = user?.username || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "A user";
      const notification = new Notification({
        message: `${userName} just paid for ${cartItems.length} item(s).`,
        type: "payment",
      });
      await notification.save();
      console.log('🔔 Admin notification created');
    } catch (err) {
      console.error('Error creating admin notification:', err);
    }

    // ✅ 10. Send confirmation email
    const emailSubject = 'Order Confirmation - Camila Aguila';
    const isPreOrder = cartItems.every(item => item.preorder === true);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #222;">Order Confirmation - Camila Aguila</h2>
        <p>Hello,</p>
        <p>Thank you for your ${isPreOrder ? "pre-order" : "purchase"}! ${isPreOrder
        ? "Your pre-order has been received. We’ll notify you once your items are available for shipping."
        : "Your order has been received and is now being processed."
      }</p>
        <h3>📦 Order Details</h3>
        <p><strong>Order Reference:</strong> ${reference}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Delivery Method:</strong> ${deliveryMethod}</p>
        ${deliveryMethod === "delivery"
        ? `<p><strong>Address:</strong> ${metadata.address}<br/><strong>Postal Code:</strong> ${metadata.postalCode}<br/><strong>Phone:</strong> ${metadata.phoneNumber}</p>`
        : ""
      }
        <h3>🛍 Items Ordered</h3>
        <ul>
          ${cartItems.map(item => `
            <li>${item.title} (Size: ${item.selectedSize}, Color: ${item.selectedColor}, Qty: ${item.quantity}) - $${item.price}</li>
          `).join("")}
        </ul>
        <p><strong>Total Amount:</strong> $${(data.amount / 100).toFixed(2)}</p>
        <p style="margin-top: 30px;">Best regards,<br/>Camila Aguila Team</p>
      </div>
    `;

    try {
      await sendConfirmationEmail(email, emailSubject, emailHtml);
      console.log('📧 Confirmation email sent successfully');
    } catch (emailErr) {
      console.error('Error sending email:', emailErr);
    }

    // ✅ 11. Redirect to order confirmation page
    res.redirect(`/order/${order._id}`);

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
    const email = paymentData.metadata?.email;

    if (!postId) {
      console.error('Post ID is missing or invalid');
      return res.status(400).json({ error: 'Post ID is missing from metadata' });
    }

    if (!email) {
      console.error('Email is missing in metadata');
      return res.status(400).json({ error: 'Email is missing from metadata' });
    }

    if (paymentData.status === "success") {
      const { cartItems, type, deliveryMethod, phoneNumber, deliveryFee, country, countryCode, address,
        postalCode } = paymentData.metadata;

      if (type === "product_purchase") {
        // Ensure delivery fee is a valid number, default to 0 if undefined
        const finalDeliveryFee = deliveryMethod === "delivery" ? deliveryFee || 0 : 0;

        console.log("Cart Items Before Order Creation:", cartItems);

        const newOrder = new Order({
          userId,
          email,
          items: cartItems.map(item => ({
            productId: item.productId,
            title: item.title,
            image: item.image,  // ✅ Ensure the correct image is stored
            price: item.price,
            quantity: item.quantity,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
            category: item.category
          })),
          totalAmount: paymentData.amount / 100, // Convert from kobo
          paymentReference: reference,
          status: "paid",
          deliveryMethod,
          phoneNumber,
          deliveryFee: finalDeliveryFee,
          country: deliveryMethod === "delivery" ? country : undefined,
          countryCode: deliveryMethod === "delivery" ? countryCode : undefined,
          address: deliveryMethod === "delivery" ? address : undefined,
          postalCode: deliveryMethod === "delivery" ? postalCode : undefined,
        });

        // await newOrder.save();
        const savedOrder = await newOrder.save();
        console.log("Saved Order:", savedOrder); ``

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

// Mobile verification endpoint
// router.post("/payment/verify-mobile", async (req, res) => {
//   const { reference } = req.body;

//   if (!reference) {
//     return res.status(400).json({ error: "Reference is required" });
//   }

//   try {
//     const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

//     // ✅ 1. Verify with Paystack
//     const verifyRes = await axios.get(
//       `https://api.paystack.co/transaction/verify/${reference}`,
//       {
//         headers: {
//           Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
//         },
//       }
//     );

//     const data = verifyRes.data.data;

//     if (data.status !== "success") {
//       return res.status(400).json({ error: "Payment not successful" });
//     }

//     // ✅ 2. Parse metadata safely
//     let metadata = data.metadata;
//     console.log("✅ Metadata received:", metadata);
//     console.log("🛒 Raw cartItems:", metadata.cartItems);

//     // If metadata is a string, parse it
//     if (typeof metadata === "string") {
//       try {
//         metadata = JSON.parse(metadata);
//       } catch (e) {
//         console.error("Failed to parse metadata:", metadata);
//         return res.status(400).json({ error: "Invalid metadata format" });
//       }
//     }

//     // ✅ 3. Parse cartItems if it's a string
//     let cartItems = metadata.cartItems;

//     // ✅ Debug: Log cartItems before checking if it's an array
//     console.log("🛒 Raw cartItems from metadata:", cartItems);

//     if (typeof cartItems === "string") {
//       try {
//         cartItems = JSON.parse(cartItems);
//         console.log("🛒 Parsed cartItems:", cartItems);
//       } catch (e) {
//         console.error("Failed to parse cartItems:", cartItems);
//         return res.status(400).json({ error: "Invalid cartItems format" });
//       }
//     }

//     // ✅ 4. Validate cartItems is an array
//     if (!Array.isArray(cartItems)) {
//       console.error("cartItems is not an array:", cartItems);
//       return res.status(400).json({ error: "cartItems must be an array" });
//     }

//     const { userId, email, deliveryMethod } = metadata;

//     // ✅ 5. Update transaction status
//     await Transaction.findOneAndUpdate(
//       { reference },
//       { status: "success", paidAt: new Date() }
//     );

//     // ✅ 6. Create Order (if not exists)
//     let orderId;

//     const existingOrder = await Order.findOne({ paymentReference: reference });
//     if (!existingOrder) {
//       const order = new Order({
//         userId,
//         email,
//         items: cartItems,
//         deliveryMethod,
//         address: metadata.address,
//         phoneNumber: metadata.phoneNumber,
//         country: metadata.country,
//         countryCode: metadata.countryCode,
//         postalCode: metadata.postalCode,
//         deliveryFee: metadata.deliveryFee || 0,
//         totalAmount: data.amount / 100,
//         paymentReference: reference,
//         status: "paid",
//       });
//       const savedOrder = await order.save();
//       orderId = savedOrder._id;
//     } else {
//       orderId = existingOrder._id;
//     }

//     // ✅ 7. Reduce stock (skip pre-order)
//     for (const item of cartItems) {
//       if (item.preorder) continue;

//       const product = await Product.findById(item.productId);
//       if (!product) continue;

//       const colorVariant = product.color.find(c => c.color === item.selectedColor);
//       if (colorVariant && colorVariant.stock >= item.quantity) {
//         colorVariant.stock -= item.quantity;
//         await product.save();
//       }
//     }

//     // ✅ 8. Notify admin
//     try {
//       const user = await User.findById(userId);
//       const userName = user?.username || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "A user";
//       const notification = new Notification({
//         message: `${userName} just paid for ${cartItems.length} item(s).`,
//         type: "payment",
//       });
//       await notification.save();
//       console.log('🔔 Admin notification created successfully');
//     } catch (err) {
//       console.error('Error creating admin notification:', err);
//     }

//     // ✅ 9. Send confirmation email
//     const emailSubject = 'Order Confirmation - Camila Aguila';
//     const isPreOrder = cartItems.every(item => item.preorder === true);

//     const emailHtml = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
//         <h2 style="color: #222;">Order Confirmation - Camila Aguila</h2>
//         <p>Hello,</p>
//         <p>Thank you for your ${isPreOrder ? "pre-order" : "purchase"}!</p>
//         <h3>📦 Order Details</h3>
//         <p><strong>Order Reference:</strong> ${reference}</p>
//         <p><strong>Email:</strong> ${email}</p>
//         <p><strong>Delivery Method:</strong> ${deliveryMethod}</p>
//         ${deliveryMethod === "delivery"
//         ? `<p><strong>Address:</strong> ${metadata.address}<br/><strong>Postal Code:</strong> ${metadata.postalCode}<br/><strong>Phone:</strong> ${metadata.phoneNumber}</p>`
//         : ""
//       }
//         <h3>🛍 Items Ordered</h3>
//         <ul>
//           ${cartItems.map(item => `
//             <li>${item.title} (Size: ${item.selectedSize}, Color: ${item.selectedColor}, Qty: ${item.quantity}) - $${item.price}</li>
//           `).join("")}
//         </ul>
//         <p><strong>Total Amount:</strong> $${(data.amount / 100).toFixed(2)}</p>
//         <p style="margin-top: 30px;">Best regards,<br/>Camila Aguila Team</p>
//       </div>
//     `;

//     try {
//       await sendConfirmationEmail(email, emailSubject, emailHtml);
//       console.log('📧 Confirmation email sent successfully');
//     } catch (err) {
//       console.error('Error sending email:', err);
//     }

//     // res.json({ success: true });
//     res.json({ success: true, orderId });
//   } catch (err) {
//     console.error("Verification error:", err);
//     res.status(500).json({ error: "Verification failed" });
//   }
// });

router.post("/payment/verify-mobile", async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: "Reference is required" });
  }

  // Helper function to encode Firebase Storage URLs correctly
  function encodeFirebaseUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/o/');
      if (pathParts.length < 2) return url;

      const baseUrl = urlObj.origin;
      const encodedPath = encodeURIComponent(pathParts[1]);
      return `${baseUrl}/o/${encodedPath}${urlObj.search}`;
    } catch (err) {
      // if invalid URL, return as is
      return url;
    }
  }

  try {
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

    // 1. Verify payment with Paystack API
    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = verifyRes.data.data;

    if (data.status !== "success") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    // 2. Parse metadata safely
    let metadata = data.metadata;
    console.log("✅ Metadata received:", metadata);
    console.log("🛒 Raw cartItems:", metadata.cartItems);

    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.error("Failed to parse metadata:", metadata);
        return res.status(400).json({ error: "Invalid metadata format" });
      }
    }

    // 3. Parse cartItems if string
    let cartItems = metadata.cartItems;

    console.log("🛒 Raw cartItems from metadata:", cartItems);

    if (typeof cartItems === "string") {
      try {
        cartItems = JSON.parse(cartItems);
        console.log("🛒 Parsed cartItems:", cartItems);
      } catch (e) {
        console.error("Failed to parse cartItems:", cartItems);
        return res.status(400).json({ error: "Invalid cartItems format" });
      }
    }

    if (!Array.isArray(cartItems)) {
      console.error("cartItems is not an array:", cartItems);
      return res.status(400).json({ error: "cartItems must be an array" });
    }

    const { userId, email, deliveryMethod } = metadata;

    // 4. Update transaction status
    await Transaction.findOneAndUpdate(
      { reference },
      { status: "success", paidAt: new Date() }
    );

    // 5. Encode image URLs inside cartItems before saving order
    const encodedCartItems = cartItems.map(item => ({
      ...item,
      image: encodeFirebaseUrl(item.image),
    }));

    // 6. Create Order (if not exists)
    let orderId;

    const existingOrder = await Order.findOne({ paymentReference: reference });
    if (!existingOrder) {
      const order = new Order({
        userId,
        email,
        items: encodedCartItems,
        deliveryMethod,
        address: metadata.address,
        phoneNumber: metadata.phoneNumber,
        country: metadata.country,
        countryCode: metadata.countryCode,
        postalCode: metadata.postalCode,
        deliveryFee: metadata.deliveryFee || 0,
        totalAmount: data.amount / 100,
        paymentReference: reference,
        status: "paid",
      });
      const savedOrder = await order.save();
      orderId = savedOrder._id;
    } else {
      orderId = existingOrder._id;
    }

    // 7. Reduce stock (skip pre-order)
    for (const item of cartItems) {
      if (item.preorder) continue;

      const product = await Product.findById(item.productId);
      if (!product) continue;

      const colorVariant = product.color.find(c => c.color === item.selectedColor);
      if (colorVariant && colorVariant.stock >= item.quantity) {
        colorVariant.stock -= item.quantity;
        await product.save();
      }
    }

    // 8. Notify admin
    try {
      const user = await User.findById(userId);
      const userName = user?.username || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "A user";
      const notification = new Notification({
        message: `${userName} just paid for ${cartItems.length} item(s).`,
        type: "payment",
      });
      await notification.save();
      console.log('🔔 Admin notification created successfully');
    } catch (err) {
      console.error('Error creating admin notification:', err);
    }

    // 9. Send confirmation email
    const emailSubject = 'Order Confirmation - Camila Aguila';
    const isPreOrder = cartItems.every(item => item.preorder === true);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #222;">Order Confirmation - Camila Aguila</h2>
        <p>Hello,</p>
        <p>Thank you for your ${isPreOrder ? "pre-order" : "purchase"}!</p>
        <h3>📦 Order Details</h3>
        <p><strong>Order Reference:</strong> ${reference}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Delivery Method:</strong> ${deliveryMethod}</p>
        ${
          deliveryMethod === "delivery"
            ? `<p><strong>Address:</strong> ${metadata.address}<br/><strong>Postal Code:</strong> ${metadata.postalCode}<br/><strong>Phone:</strong> ${metadata.phoneNumber}</p>`
            : ""
        }
        <h3>🛍 Items Ordered</h3>
        <ul>
          ${encodedCartItems
            .map(
              item =>
                `<li>${item.title} (Size: ${item.selectedSize}, Color: ${item.selectedColor}, Qty: ${item.quantity}) - $${item.price}</li>`
            )
            .join("")}
        </ul>
        <p><strong>Total Amount:</strong> $${(data.amount / 100).toFixed(2)}</p>
        <p style="margin-top: 30px;">Best regards,<br/>Camila Aguila Team</p>
      </div>
    `;

    try {
      await sendConfirmationEmail(email, emailSubject, emailHtml);
      console.log('📧 Confirmation email sent successfully');
    } catch (err) {
      console.error('Error sending email:', err);
    }

    res.json({ success: true, orderId });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.get('/orders', authenticate, authorizeRoles('admin', 'manager', 'support', 'editor', 'guest'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 orders per page
    const skip = (page - 1) * limit;

    const total = await Order.countDocuments();
    const orders = await Order.find()
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      orders,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get("/orders/:orderId", authenticate, isAdmin, async (req, res) => {
  const { orderId } = req.params;

  try {
    // Get the order and populate userId with selected fields
    const order = await Order.findById(orderId).populate('userId', 'username profileImage');

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    let previousOrdersCount = 0;
    let userInfo = null;

    // If user info is available (i.e., populate worked)
    if (order.userId && order.userId._id) {
      userInfo = {
        username: order.userId.username,
        profileImage: order.userId.profileImage,
      };

      previousOrdersCount = await Order.countDocuments({
        userId: order.userId._id,
        _id: { $ne: order._id }
      });
    } else if (order.userId) {
      // Fallback: order.userId exists but wasn't populated (e.g. user was deleted)
      previousOrdersCount = await Order.countDocuments({
        userId: order.userId,
        _id: { $ne: order._id }
      });
    } else {
      console.warn(`⚠️ Order ${orderId} has no userId associated.`);
    }

    res.status(200).json({
      order,
      user: userInfo,
      previousOrdersCount,
    });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/order/:orderId", async (req, res) => {
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

// GET /orders/user/:userId
router.get("/orders/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this user." });
    }

    res.status(200).json({ orders });
  } catch (err) {
    console.error("Error fetching user orders:", err);
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

router.get('/verify-return', async (req, res) => {
  try {
    const { orderNumber, orderEmail } = req.query;

    // Validate input
    if (!orderNumber || !orderEmail) {
      return res.status(400).json({ message: 'Order number and email are required' });
    }

    // Log received parameters for debugging
    console.log("Received Order Number:", orderNumber);
    console.log("Received Order Email:", orderEmail);

    // Log the query object
    console.log("Query Object:", { paymentReference: orderNumber, email: orderEmail });

    // Query the order by paymentReference and email
    console.log("Executing Query...");
    const order = await Order.findOne({
      paymentReference: orderNumber,
      email: orderEmail
    }).exec();

    // Log the query result
    console.log("Query Result:", order);

    // Handle case where no order is found
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Return the order details as JSON
    res.json({
      reference: order.paymentReference,
      email: order.email,
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items,
      createdAt: order.createdAt,
    });
  } catch (error) {
    // Log the full error details for debugging
    console.error("Error verifying order:", error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/process-return', async (req, res) => {
  const { orderNumber, returnOption } = req.body;

  // Validate input
  if (!orderNumber || !returnOption) {
    return res.status(400).json({ message: "Order number and return option are required." });
  }

  try {
    // Find the order by order number (paymentReference)
    const order = await Order.findOne({ paymentReference: orderNumber });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Check if the order is eligible for a return based on its status
    if (order.status === 'canceled') {
      return res.status(400).json({ message: "This order has been canceled and cannot be returned." });
    }

    // Handle the return based on the selected option
    switch (returnOption) {
      case 'refund':
        if (order.status !== 'paid' && order.status !== 'delivered') {
          return res.status(400).json({
            message: `Refunds are only available for orders with a status of 'paid' or 'delivered'. Your order's current status is '${order.status}'.`
          });
        }
        order.status = 'refund_requested'; // Update status to reflect that refund is being requested
        break;
      case 'exchange':
        if (order.status === 'shipped' || order.status === 'delivered') {
          return res.status(400).json({ message: "Exchanges are not allowed after the order is shipped or delivered." });
        }
        order.status = 'exchange_requested'; // Update status for exchange request
        break;
      case 'store-credit':
        if (order.status === 'shipped' || order.status === 'delivered') {
          return res.status(400).json({ message: "Store credit is not available for orders that have been shipped or delivered." });
        }
        order.status = 'store_credit_issued'; // Issue store credit
        break;
      default:
        return res.status(400).json({ message: "Invalid return option." });
    }

    // Save the updated order
    await order.save();

    // Prepare email content
    const emailSubject = 'Return Request Processed - Camila Aguila';
    const emailText = `Hello ${order.email},\n\n` +
      `Thank you for contacting us regarding your order.\n\n` +
      `We have successfully processed your return request. Here are the details:\n\n` +
      `📦 Order Details:\n` +
      `- Order Reference: ${order.paymentReference}\n` +
      `- Order Email: ${order.email}\n` +
      `- Items Ordered:\n` +
      `${order.items.map(item => `  - ${item.title} (Size: ${item.selectedSize}, Color: ${item.selectedColor}, Qty: ${item.quantity})`).join("\n")}\n\n` +
      `🛍 Return Option: ${returnOption}\n\n` +
      `You will be notified once the return has been fully processed. If you have any issues, please contact us using your order reference number.\n\n` +
      `Best regards,\n` +
      `Camila Aguila Team`;

    // Send confirmation email
    try {
      await sendConfirmationEmail(order.email, emailSubject, emailText);
      console.log('Confirmation email sent successfully');
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
    }

    // Respond with success
    res.status(200).json({
      message: `Return request for order ${order.paymentReference} has been processed as ${returnOption}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});

// Update order status (Admin only)
// router.patch('/status/:orderId', authenticate, isAdmin, async (req, res) => {
//   const { orderId } = req.params;
//   const { status } = req.body;

//   const validStatuses = [
//     "pending",
//     "paid",
//     "processing",
//     "shipped",
//     "delivered",
//     "canceled",
//     "refund_requested",
//     "refunded",
//     "store_credit_issued",
//     "outForDelivery",
//     "disputed",
//     "returned",
//   ];
//   if (!validStatuses.includes(status)) {
//     return res.status(400).json({ message: "Invalid status value." });
//   }

//   try {
//     const updatedOrder = await Order.findByIdAndUpdate(
//       orderId,
//       { status },
//       { new: true }
//     );

//     if (!updatedOrder) {
//       return res.status(404).json({ message: "Order not found." });
//     }

//     res.status(200).json({ message: "Order status updated.", order: updatedOrder });
//   } catch (error) {
//     console.error("Error updating order status:", error);
//     res.status(500).json({ message: "Server error." });
//   }
// });

router.patch('/status/:orderId', authenticate, isAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "canceled",
    "refund_requested",
    "refunded",
    "store_credit_issued",
    "outForDelivery",
    "disputed",
    "returned",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate("userId"); // Ensure user is populated

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    // 🛎 Create admin notification based on status
    try {
      const user = updatedOrder.user;
      const userName =
        user?.username || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "A user";

      const notificationMessage = `Order ${updatedOrder._id} status changed to '${status}' by admin. (${userName})`;

      const newNotification = new Notification({
        message: notificationMessage,
        type: "order", // can use different types per status if needed
      });

      await newNotification.save();
      console.log("🔔 Admin notification created successfully");
    } catch (notificationError) {
      console.error("Error creating admin notification:", notificationError);
    }

    const email = updatedOrder.userId?.email || updatedOrder.email;

    const emailSubject = 'Order Status Change- Camila Aguila';
    const emailHtml = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 40px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #222;">Order Status Update</h2>
        <p style="font-size: 16px; color: #555;">
          Hello, 
        </p>
        <p style="font-size: 16px; color: #555;">
          We're writing to let you know that the status of your order <strong style="color: #000;">#${updatedOrder._id}</strong> has been updated to:
        </p>
        <p style="font-size: 18px; color: #007bff; font-weight: bold; margin-top: 10px; margin-bottom: 20px;">
          ${status.charAt(0).toUpperCase() + status.slice(1)}
        </p>
        <p style="font-size: 16px; color: #555;">
          You can log into your account to view more details or track your order.
        </p>
        <div style="margin: 30px 0;">
          <a href="https://yourdomain.com/account/orders" style="display: inline-block; background-color: #007bff; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View My Order
          </a>
        </div>
        <p style="font-size: 16px; color: #555;">
          Thank you for shopping with <strong>Camila Aguila</strong>!
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 13px; color: #999; text-align: center;">
          This is an automated message, please do not reply directly to this email.
        </p>
      </div>
    </div>
  `;

    try {
      await sendConfirmationEmail(email, emailSubject, emailHtml);
      console.log('Confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }


    res.status(200).json({ message: "Order status updated.", order: updatedOrder });

  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error." });
  }
});


router.get("/most-bought", async (req, res) => {
  try {
    const mostBought = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId", // group by productId
          totalSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    const productIds = mostBought
      .filter(item => item._id) // remove nulls if any
      .map(item => new mongoose.Types.ObjectId(item._id)); // Use `new` here

    if (productIds.length === 0) {
      return res.status(200).json([]); // nothing to fetch
    }

    const products = await Product.find({ _id: { $in: productIds } }).lean();

    const productsWithSales = products.map(product => {
      const match = mostBought.find(sale => {
        return sale._id && sale._id.toString() === product._id.toString();
      });

      return {
        ...product,
        totalSold: match?.totalSold || 0,
      };
    });

    res.status(200).json(productsWithSales);
  } catch (err) {
    console.error("Error fetching most bought products:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get('/sales-by-country', async (req, res) => {
  try {
    // Step 1: Aggregate data to calculate total items sold per country
    const countryStats = await Transaction.aggregate([
      { $unwind: "$metadata.cartItems" }, // Unwind cart items
      {
        $group: {
          _id: "$metadata.countryCode", // Group by countryCode (ISO 3166-1 alpha-2 code)
          countryName: { $first: "$metadata.country" }, // Extract country name
          totalItemsSold: {
            $sum: { $toInt: "$metadata.cartItems.quantity" } // Safely sum quantity
          },
          totalTransactions: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null, // Group all countries together
          totalGlobalItemsSold: { $sum: "$totalItemsSold" }, // Calculate global total
          countries: {
            $push: {
              countryCode: "$_id",
              countryName: { $ifNull: ["$countryName", "Unknown"] }, // Use countryName or "Unknown"
              totalItemsSold: "$totalItemsSold",
              totalTransactions: "$totalTransactions"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalGlobalItemsSold: 1,
          countries: {
            $map: {
              input: "$countries",
              as: "country",
              in: {
                countryCode: "$$country.countryCode",
                countryName: "$$country.countryName",
                totalItemsSold: "$$country.totalItemsSold",
                totalTransactions: "$$country.totalTransactions",
                percentage: {
                  $multiply: [
                    { $divide: ["$$country.totalItemsSold", "$totalGlobalItemsSold"] }, // Calculate percentage
                    100
                  ]
                }
              }
            }
          }
        }
      },
      { $unwind: "$countries" }, // Flatten the countries array
      { $replaceRoot: { newRoot: "$countries" } }, // Promote each country object to the root level
      { $sort: { percentage: -1 } }, // Sort by percentage in descending order
      { $limit: 5 } // Limit to top 5 countries
    ]);

    res.json(countryStats);
  } catch (err) {
    console.error('Error fetching sales by country:', err.stack); // Log full stack trace for debugging
    res.status(500).send({ msg: "Server error" });
  }
});

module.exports = router;
