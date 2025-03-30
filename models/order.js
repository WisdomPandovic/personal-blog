// const mongoose = require("mongoose");

// const OrderSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   items: [
//     {
//       title: String,
//       image: String,
//       price: Number,
//       selectedColor: String,
//       selectedSize: String,
//       quantity: Number,
//     },
//   ],
//   totalAmount: { type: Number, required: true },
//   deliveryFee: { type: Number, default: 0 }, 
//   deliveryMethod: { type: String, enum: ["pickup", "delivery"], required: true },
//   address: { type: String },
//   postalCode: { type: String }, 
//   phoneNumber: { type: String, required: true },
//   paymentReference: { type: String, required: true, unique: true },
//   status: { type: String, enum: ["pending", "paid", "processing", "shipped", "delivered", "canceled"], default: "pending" },
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model("Order", OrderSchema);

const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
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
    deliveryFee: { type: Number, default: 0 },
    deliveryMethod: { type: String, enum: ["pickup", "delivery"], required: true },
    address: {
      type: String,
      validate: {
        validator: function (value) {
          return this.deliveryMethod === "delivery" ? !!value : true;
        },
        message: "Address is required for delivery.",
      },
    },
    postalCode: { type: String },
    phoneNumber: { type: String, required: true },
    paymentReference: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending", "paid", "processing", "shipped", "delivered", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);

