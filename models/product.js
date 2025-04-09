

// const mongoose = require('mongoose');

// const ProductSchema = new mongoose.Schema({
//     title: { type: String, required: true },
//     images: { 
//         type: Map, 
//         of: [String], // A map of color to image array
//         required: true 
//     }, 
//     info: { type: String, required: true },
//     price: { type: String, required: true },
//     category: { type: mongoose.Schema.Types.ObjectId, ref: 'category' },
//     color: [{ type: String, required: false, unique: false }],
//     size: [{ type: String, required: true, unique: false }],
//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
//     stock: { type: Number, required: true, default: 0 },
//     status: {
//         type: String,
//         enum: ['available', 'unavailable', 'out_of_stock'],
//         default: 'available'
//       },      
//     date: { type: Date, default: Date.now },
// });

// const Product = mongoose.model('products', ProductSchema);

// module.exports = Product;




const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    title: { type: String, required: true },
    images: {
        type: Map,
        of: [String], // A map of color to image array
        required: true
    },
    info: { type: String, required: true },
    price: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'category' },
    color: [
        {
            color: { type: String, required: true }, // Color name
            stock: { type: Number, required: true, default: 0 }, // Stock for this color variant
        },
    ],
    preorder: { type: Boolean, default: false }, // Track if it's a pre-order item
    availabilityDate: { type: Date, required: false },
    size: [{ type: String, required: true, unique: false }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    status: {
        type: String,
        enum: ['available', 'unavailable', 'out_of_stock'],
        default: 'available'
    },
    date: { type: Date, default: Date.now },
});

const Product = mongoose.model('products', ProductSchema);

module.exports = Product;
