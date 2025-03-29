const Product = require("../../models/product");
const authenticate = require('../../middleware/authenticate'); 
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const multer = require("multer");
const path = require("path");
const PORT = 3007;
const FILE_PATH = `http://localhost:${PORT}/postimage/`;
// const FILE_PATH = `https://imgurif-api.onrender.com/postimage/`;
const User = require("../../models/user");
const Category = require("../../models/category");
const express = require('express');
const router = express.Router();

const storage = multer.diskStorage({
	destination: (reg, file, cb) => {
		//let _dir = path.join(__dirname, "../../public/postimage");
		//cb(null, _dir);
		// cb(null, )
		cb(null, "public/postimage")

	},
	filename: (reg, file, cb) => {
		let filename = file.originalname.toLowerCase();
		cb(null, filename);
	},
});

const postimage = multer({ storage: storage });

// const routes = function (app) {
router.get('/product', async function (req, res) {
	try {
		let product = await Product.find().populate("category").populate('user').lean();
		res.json(product)

	} catch (err) {
		res.status(500).send(err.message)
	}
});

router.post("/product", async function (req, res) {
	try {
		console.log("Received request body:", req.body);

		const { title, size, info, price, category, user, images, color, } = req.body;

		// Ensure all required fields are provided
		if (!title) {
			return res.status(400).json({ message: "Title is required." });
		}
		if (!info) {
			return res.status(400).json({ message: "Info is required." });
		}
        if (!size) {
			return res.status(400).json({ message: "Size is required." });
		}
		if (!price) {
			return res.status(400).json({ message: "Price is required." });
		}
		if (!category) {
			return res.status(400).json({ message: "Category is required." });
		}
		if (!user) {
			return res.status(400).json({ message: "User is required." });
		}

		// Validate user ID
		if (!ObjectId.isValid(user)) {
			return res.status(400).json({ msg: "Invalid user ID" });
		}

		const foundUser = await User.findById(user);
		if (!foundUser) {
			return res.status(404).json({ msg: "User not found" });
		}

		if (foundUser.role !== "admin") {
			return res.status(403).json({ msg: "Only admins can create posts" });
		}

		// Validate category
		if (!ObjectId.isValid(category)) {
			return res.status(400).json({ msg: "Invalid category ID" });
		}

		const foundCategory = await Category.findById(category);
		if (!foundCategory) {
			return res.status(404).json({ msg: "Category not found" });
		}

		// Ensure images and video URLs are provided
		const imagePaths = Array.isArray(images) ? images : [];
		if (imagePaths.length === 0) {
			return res.status(400).json({ msg: "At least one image URL is required." });
		}

		// if (!video) {
		// 	return res.status(400).json({ msg: "A video URL is required." });
		// }

		// Create a new post
		const newProduct = new Product({
			title,
			images: imagePaths, // Accepting image URLs
			color,
			price,
			category,
			user,
            info,
            size,
		});

		await newProduct.save();

		// Update category with the new post ID
		await Category.findByIdAndUpdate(category, { $push: { products: newProduct._id } });

		res.status(200).json({
			success: true,
			message: "Product created successfully",
			data: newProduct,
		});
	} catch (err) {
		console.error("Error creating product:", err);
		res.status(500).json({ success: false, message: err.message });
	}
});

router.get('/product/title/:title', async function (req, res) {
    try {
        const { title } = req.params;

        if (!title) {
            return res.status(400).json({ message: "Title is required." });
        }

        const product = await Product.findOne({ title: title }).populate("category").populate("user").lean();

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/product/category/:categoryId', async (req, res) => {
	try {
		const categoryId = req.params.categoryId;
		const product = await Product.find({ category: categoryId });
		res.json(product);
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
