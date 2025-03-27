const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    title: { type: String, required: true },
    images: [{ type: String, required: true }], 
    info: { type: String, required: true },
    price: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'category',},
    color: [{ type: String, required: false, unique: false }],
    size: [{ type: String, required: true, unique: false }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    date: { type: Date, default: Date.now },
});

const Product = mongoose.model('products', ProductSchema);

module.exports = Product;
