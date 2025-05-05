dotenv.config(); // Load environment variables from .env file

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/product'); // Adjust path if needed

const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/camila-blog";

mongoose.connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

(async () => {
    try {
        const products = await Product.find({ createdAt: { $exists: false } });

        console.log(`Found ${products.length} products without createdAt`);

        for (const product of products) {
            const createdAtValue = product.date || new Date();

            product.createdAt = createdAtValue;
            product.updatedAt = createdAtValue; // optional
            await product.save();

            console.log(`Updated product: ${product.title}`);
        }

        console.log('Backfilling complete.');
        mongoose.disconnect();
    } catch (err) {
        console.error('Error backfilling createdAt:', err);
        mongoose.disconnect();
    }
})();
