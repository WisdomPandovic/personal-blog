const express = require('express');
const axios = require('axios');
const router = express.Router();
const Post = require("../../models/post");
const User = require("../../models/user");
const Order = require("../../models/order");
const sendConfirmationEmail = require("../../utils/emailService");

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

    // Send a confirmation email
    const emailSubject = 'Contact Form Submission';
    const emailText = `Hello,\n\nThank you for subscribing to the post. You will be redirected to the post details page soon.\n\nBest regards,\nCamila Aguila Team`;

    try {
      await sendConfirmationEmail(email, emailSubject, emailText);
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
  const { amount, email, userId, cartItems, deliveryMethod, deliveryFee, address, postalCode, phoneNumber } = req.body;

  if (!amount || !email || !userId || !cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "Invalid payment data." });
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

    // Explicitly encode the image URLs to preserve their original format
    const metadata = {
      userId,
      cartItems: cartItems.map(item => ({
        title: item.title,
        image: encodeURIComponent(item.image), // ✅ Encode the image URL
        price: item.price,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
      })),
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

    // Send a confirmation email
    //  const emailSubject = 'Product Payment';
    //  const emailText = `Hello,\n\nThank you for ordering our product. You will be updated on the order process soon.\n\nBest regards,\nCamila Aguila Team`;

    //  try {
    //    await sendConfirmationEmail(email, emailSubject, emailText);
    //    console.log('Confirmation email sent successfully');
    //  } catch (error) {
    //    console.error('Error sending confirmation email:', error);
    //  }

    const emailSubject = 'Order Confirmation - Camila Aguila';

    const emailText = `Hello,

Thank you for your purchase! Your order has been received and is now being processed.

📦 Order Details:
- Order Reference: ${response.data.data.reference}
- Order Email: ${email}
- Delivery Method: ${deliveryMethod}
${deliveryMethod === "delivery" ? `- Address: ${address}\n- Postal Code: ${postalCode}\n- Phone: ${phoneNumber}` : ""}

🛍 Items Ordered:
${cartItems.map(item => `- ${item.title} (Size: ${item.selectedSize}, Color: ${item.selectedColor}, Qty: ${item.quantity}) - $${item.price}`).join("\n")}

Total Amount: $${totalAmount}

You will receive further updates on your order soon. If you have any issues or want to request a return, please use your order reference number and email to contact us.

Best regards,  
Camila Aguila Team`;

    try {
      await sendConfirmationEmail(email, emailSubject, emailText);
      console.log('Confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }


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
      const { cartItems, type, deliveryMethod, phoneNumber, deliveryFee } = paymentData.metadata;

      if (type === "product_purchase") {
        // Ensure delivery fee is a valid number, default to 0 if undefined
        const finalDeliveryFee = deliveryMethod === "delivery" ? deliveryFee || 0 : 0;

        console.log("Cart Items Before Order Creation:", cartItems);

        const newOrder = new Order({
          userId,
          email,
          items: cartItems.map(item => ({
            title: item.title,
            image: item.image,  // ✅ Ensure the correct image is stored
            price: item.price,
            quantity: item.quantity,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
          })),
          totalAmount: paymentData.amount / 100, // Convert from kobo
          paymentReference: reference,
          status: "paid",
          deliveryMethod,
          phoneNumber,
          deliveryFee: finalDeliveryFee,
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

// router.get("/payment/callback", async (req, res) => {
//   const { reference } = req.query;

//   if (!reference) {
//     return res.status(400).json({ error: "Invalid callback data" });
//   }

//   try {
//     const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

//     // Verify payment with Paystack
//     const response = await axios.get(
//       `https://api.paystack.co/transaction/verify/${reference}`,
//       {
//         headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
//       }
//     );

//     const paymentData = response.data.data;

//     // Log metadata received from Paystack
//     console.log("Payment Data Metadata:", JSON.stringify(paymentData.metadata, null, 2));

//     // Ensure postId and userId are available in metadata
//     const postId = paymentData.metadata?.postId || 'defaultPostId';
//     const userId = paymentData.metadata?.userId;

//     if (!postId) {
//       console.error('Post ID is missing or invalid');
//       return res.status(400).json({ error: 'Post ID is missing from metadata' });
//     }

//     if (paymentData.status === "success") {
//       const { cartItems, type, deliveryMethod, phoneNumber, deliveryFee } = paymentData.metadata;

//       if (type === "product_purchase") {
//         // Ensure delivery fee is a valid number, default to 0 if undefined
//         const finalDeliveryFee = deliveryMethod === "delivery" ? deliveryFee || 0 : 0;

//         // Preserve the original image URLs
//         const updatedCartItems = cartItems.map(item => ({
//           ...item,
//           originalImage: item.image, // Store the original URL for reference
//           image: encodeURIComponent(item.image), // Attempt to re-encode the URL
//         }));

//         // Log the updated cart items to verify the re-encoded URLs
//         console.log("Updated Cart Items After Re-encoding:", JSON.stringify(updatedCartItems, null, 2));

//         // Compare original and re-encoded URLs
//         updatedCartItems.forEach((item, index) => {
//           console.log(`Item ${index + 1}:`);
//           console.log("Original Image URL:", item.originalImage);
//           console.log("Re-encoded Image URL:", item.image);
//         });

//         // Save order for product purchase
//         const newOrder = new Order({
//           userId,
//           items: updatedCartItems.map(item => ({
//             title: item.title,
//             image: item.image, // Use the re-encoded image URL
//             price: item.price,
//             quantity: item.quantity,
//             selectedColor: item.selectedColor,
//             selectedSize: item.selectedSize,
//           })),
//           totalAmount: paymentData.amount / 100, // Convert from kobo
//           paymentReference: reference,
//           status: "paid",
//           deliveryMethod,
//           phoneNumber,
//           deliveryFee: finalDeliveryFee,
//         });

//         // Save the new order
//         const savedOrder = await newOrder.save();
//         console.log("Order saved successfully:", savedOrder);

//         // Redirect to order confirmation page
//         return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/order-confirmation/${savedOrder._id}`);
//       } else if (type === "blog_subscription") {
//         // Update the post as paid in the PostModel
//         await Post.updateOne({ _id: postId }, { paid: true });

//         // Add postId to the user's paidPosts array
//         await User.updateOne(
//           { _id: userId },
//           { $addToSet: { paidPosts: postId } }
//         );

//         // Redirect to the post page
//         return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/blog/${postId}`);
//       } else {
//         // Unknown type, redirect to a generic success page
//         return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/payment-success`);
//       }
//     } else {
//       // If payment fails, redirect to failure page
//       return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/payment-failed`);
//     }
//   } catch (err) {
//     console.error("Error verifying payment:", err.message || err);
//     return res.redirect(`https://chilla-sweella-personal-blog.vercel.app/payment-failed`);
//   }
// });

router.get('/orders/verify-return', async (req, res) => {
  try {
    const { orderNumber, orderEmail } = req.body;

    if (!orderNumber || !orderEmail) {
      return res.status(400).json({ message: 'Order number and email are required' });
    }

    const order = await Order.findOne({ reference: orderNumber, email: orderEmail });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      reference: order.reference,
      status: order.status,
      totalAmount: order.totalAmount,
      email: order.email,
      items: order.items,
      createdAt: order.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


module.exports = router;
