// helpers/paymentHandlers.js
const saveOrderFromPaymentData = async (paymentData) => {
    const { reference, amount, metadata, status } = paymentData;
  
    if (status !== "success") {
      throw new Error("Payment not successful");
    }
  
    if (metadata.type === "product_purchase") {
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
      } = metadata;
  
      const finalDeliveryFee = deliveryMethod === "delivery" ? deliveryFee || 0 : 0;
  
      const newOrder = new Order({
        userId,
        email,
        items: cartItems.map(item => ({
          productId: item.productId,
          title: item.title,
          image: decodeURIComponent(item.image), // ✅ decode image URL
          price: item.price,
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          category: item.category
        })),
        totalAmount: amount / 100, // Convert from kobo
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
  
    if (metadata.type === "blog_subscription") {
      await Post.updateOne({ _id: metadata.postId }, { paid: true });
      await User.updateOne(
        { _id: metadata.userId },
        { $addToSet: { paidPosts: metadata.postId } }
      );
      return { type: "blog_subscription", postId: metadata.postId };
    }
  
    throw new Error("Unknown payment type");
  };
  
  module.exports = { saveOrderFromPaymentData };
  