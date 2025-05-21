const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        required: true,
      },
      title: String,
      image: String,
      price: Number,
      selectedColor: String,
      selectedSize: String,
      quantity: Number,
    },
  ],
  totalAmount: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 }, 
  deliveryMethod: { type: String, enum: ["pickup", "delivery"], required: true },
  address: { type: String },
  country: { type: String },
  countryCode: { type: String },
  postalCode: { type: String }, 
  phoneNumber: { type: String, required: function() { return this.deliveryMethod === "delivery"; } }, 
  paymentReference: { type: String, required: true, unique: true },
  status: { type: String, enum: ["pending", "paid", "processing", "shipped", "delivered", "outForDelivery", "canceled", "refund_requested", "refunded", "disputed", "returned", "store_credit_issued"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
