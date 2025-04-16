// models/Transaction.js
import mongoose from "mongoose";

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

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
