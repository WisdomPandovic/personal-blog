const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      title: String,
      image: String,
      price: Number,
      selectedColor: String,
      selectedSize: String,
      quantity: Number,
    },
  ],
  totalAmount: { type: Number, required: true },
  paymentReference: { type: String, required: true, unique: true },
  status: { type: String, enum: ["pending", "paid", "shipped"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
