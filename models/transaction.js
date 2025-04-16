// models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  reference: String,
  amount: Number,
  status: String,
  channel: String,
  currency: String,
  paidAt: Date,
  gatewayResponse: String,
  paymentMethod: String,
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);
