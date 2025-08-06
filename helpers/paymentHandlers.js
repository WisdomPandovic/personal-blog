// helpers/paymentHandlers.js
const Order = require("../models/order");
const Post = require("../models/post");
const User = require("../models/user");

const saveOrderFromPaymentData = async (paymentData) => {
  const { reference, amount, metadata, status } = paymentData;

  if (status !== "success") {
    throw new Error("Payment not successful");
  }

  // Parse metadata if Paystack sends it as a string
  const meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;

  if (meta.type === "product_purchase") {
    const {
      userId,
      email,
      cartItems,
      deliveryMethod,
      phoneNumber,
      deliveryFee,
      country,
      countryCode,
      address,
      postalCode,
    } = meta;

    const finalDeliveryFee = deliveryMethod === "delivery" ? deliveryFee || 0 : 0;

    const newOrder = new Order({
      userId,
      email,
      items: cartItems.map(item => ({
        productId: item.productId,
        title: item.title,
        image: decodeURIComponent(item.image),
        price: item.price,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        category: item.category
      })),
      totalAmount: amount / 100, // from kobo to naira
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

    const savedOrder = await newOrder.save();
    return { type: "product_purchase", orderId: savedOrder._id };
  }

  if (meta.type === "blog_subscription") {
    await Post.updateOne({ _id: meta.postId }, { paid: true });
    await User.updateOne(
      { _id: meta.userId },
      { $addToSet: { paidPosts: meta.postId } }
    );
    return { type: "blog_subscription", postId: meta.postId };
  }

  throw new Error("Unknown payment type");
};

module.exports = { saveOrderFromPaymentData };
