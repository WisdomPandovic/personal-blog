const Product = require("../../models/product");
const authenticate = require('../../middleware/authenticate');
const isAdmin = require('../../middleware/admin');
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
router.get('/products', async function (req, res) {
	try {
		let product = await Product.find().populate("category").populate('user').lean();
		res.json(product)

	} catch (err) {
		res.status(500).send(err.message)
	}
});

router.get('/product', async function (req, res) {
	try {
		const { page = 1, limit = 10, category = "", searchTerm = "" } = req.query;
		const query = {};

		// If category is provided, filter by category
		if (category) {
			query.category = category;
		}

		// If searchTerm is provided, filter by product title (or any other fields you want to search)
		if (searchTerm) {
			query.title = { $regex: searchTerm, $options: 'i' }; // Case-insensitive search on the title
		}

		// Fetch products based on query, sorting by creation date
		const products = await Product.find(query)
			.populate("category")
			.populate("user")
			.sort({ createdAt: -1 }) // Sort by creation date (newest first)
			.skip((page - 1) * limit) // Pagination
			.limit(Number(limit)) // Limit results based on page and limit
			.lean();

		const totalProducts = await Product.countDocuments(query); // Get the total number of products for pagination

		res.json({
			products,
			pagination: {
				totalProducts,
				totalPages: Math.ceil(totalProducts / limit),
			},
		});
	} catch (err) {
		res.status(500).send(err.message);
	}
});

router.post("/product", async function (req, res) {
	try {
		console.log("Received request body:", req.body);

		const { title, size, info, price, category, brand, user, images, color, stock = 0 } = req.body;

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

		if (foundUser.roleName !== "admin") {
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
		// const imagePaths = Array.isArray(images) ? images : [];
		// if (imagePaths.length === 0) {
		// 	return res.status(400).json({ msg: "At least one image URL is required." });
		// }

		if (!images || Object.keys(images).length === 0) {
			return res.status(400).json({ msg: "Images field is required." });
		}

		// Auto-determine product status based on stock
		let status = stock > 0 ? "available" : "out_of_stock";

		if (stock < 0) {
			return res.status(400).json({ message: "Stock must be a non-negative number." });
		}

		// Create a new post
		const newProduct = new Product({
			title,
			images, // Accepting image URLs
			color,
			price,
			category,
			brand,
			user,
			info,
			size,
			stock,
			status,
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

// PUT - Replace entire product
// router.put('/product/:id', async (req, res) => {
// 	try {
// 		const { id } = req.params;
// 		const updateData = req.body;

// 		if (!ObjectId.isValid(id)) {
// 			return res.status(400).json({ message: "Invalid product ID." });
// 		}

// 		const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
// 			new: true,
// 			overwrite: true, // replaces the whole document
// 			runValidators: true,
// 		});

// 		if (!updatedProduct) {
// 			return res.status(404).json({ message: "Product not found." });
// 		}

// 		res.json({ success: true, message: "Product fully updated.", data: updatedProduct });
// 	} catch (err) {
// 		res.status(500).json({ message: err.message });
// 	}
// });

// router.patch('/product/:id', async (req, res) => {
// 	try {
// 		const { id } = req.params;
// 		const updates = req.body;

// 		if (!ObjectId.isValid(id)) {
// 			return res.status(400).json({ message: "Invalid product ID." });
// 		}

// 		const product = await Product.findById(id);
// 		if (!product) {
// 			return res.status(404).json({ message: "Product not found." });
// 		}

// 		const updateData = { ...updates };

// 		// Validate stock if provided
// 		if (updates.stock !== undefined) {
// 			if (typeof updates.stock !== 'number' || updates.stock < 0) {
// 				return res.status(400).json({ message: "Stock must be a non-negative number." });
// 			}

// 			// Auto-update status ONLY if status wasn't explicitly sent
// 			if (!updates.status) {
// 				updateData.status = updates.stock > 0 ? 'available' : 'out_of_stock';
// 			}
// 		}

// 		// Update product
// 		const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
// 		res.status(200).json({ success: true, message: "Product updated", data: updatedProduct });

// 	} catch (err) {
// 		console.error(err);
// 		res.status(500).json({ message: err.message });
// 	}
// });

// // PATCH - Update only specific fields
// router.patch('/product/:id', async (req, res) => {
// 	try {
// 		const { id } = req.params;
// 		const updates = req.body;

// 		if (!ObjectId.isValid(id)) {
// 			return res.status(400).json({ message: "Invalid product ID." });
// 		}

// 		const product = await Product.findById(id);
// 		if (!product) {
// 			return res.status(404).json({ message: "Product not found." });
// 		}

// 		// Update stock if provided
// 		if (updates.stock !== undefined) {
// 			if (typeof updates.stock !== 'number' || updates.stock < 0) {
// 				return res.status(400).json({ message: "Stock must be a non-negative number." });
// 			}

// 			// Set stock and update status accordingly
// 			updates.status = updates.stock > 0 ? 'available' : 'out_of_stock';
// 		}

// 		// Update product
// 		const updatedProduct = await Product.findByIdAndUpdate(id, updates, { new: true });
// 		res.status(200).json({ success: true, message: "Product updated", data: updatedProduct });
// 	} catch (err) {
// 		console.error(err);
// 		res.status(500).json({ message: err.message });
// 	}
// });


router.patch('/product/:id', authenticate, isAdmin, async (req, res) => {
	try {
		const { id } = req.params;
		const updates = req.body;

		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ message: "Invalid product ID." });
		}

		const product = await Product.findById(id);
		if (!product) {
			return res.status(404).json({ message: "Product not found." });
		}

		const updateData = { ...updates };

		// If 'color' array is being updated, recalculate total stock
		if (Array.isArray(updates.color)) {
			let totalStock = 0;

			for (const variant of updates.color) {
				if (
					!variant.color ||
					typeof variant.stock !== "number" ||
					variant.stock < 0
				) {
					return res.status(400).json({
						message: "Each color must have a valid 'color' and non-negative 'stock'.",
					});
				}

				totalStock += variant.stock;
			}

			// Set status based on total stock (unless status explicitly provided)
			if (!updates.status) {
				updateData.status = totalStock > 0 ? "available" : "out_of_stock";
			}

			// Optionally, store the totalStock on the root level (if desired)
			updateData.stock = totalStock;
		}

		const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
			new: true,
		});

		res
			.status(200)
			.json({ success: true, message: "Product updated", data: updatedProduct });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: err.message });
	}
});

// DELETE Product
router.delete("/product/:id", authenticate, isAdmin, async function (req, res) {
	try {
	  const productId = req.params.id;
  
	  // Validate product ID
	  if (!ObjectId.isValid(productId)) {
		return res.status(400).json({ msg: "Invalid product ID" });
	  }
  
	  // Find product
	  const product = await Product.findById(productId);
	  if (!product) {
		return res.status(404).json({ msg: "Product not found" });
	  }
  
	  // Delete product
	  await Product.findByIdAndDelete(productId);
  
	  // Remove product from its category
	  await Category.findByIdAndUpdate(product.category, {
		$pull: { products: product._id },
	  });
  
	  res.status(200).json({ success: true, message: "Product deleted successfully." });
	} catch (err) {
	  console.error("Error deleting product:", err);
	  res.status(500).json({ success: false, message: err.message });
	}
  });

  router.patch('/product/title/:title', authenticate, isAdmin, async (req, res) => {
	try {
	  const { title } = req.params;
	  const updates = req.body;
  
	  const product = await Product.findOne({ title });
	  if (!product) {
		return res.status(404).json({ message: "Product not found." });
	  }
  
	  const updateData = { ...updates };
  
	  // If 'color' array is being updated, recalculate total stock
	  if (Array.isArray(updates.color)) {
		let totalStock = 0;
  
		for (const variant of updates.color) {
		  if (
			!variant.color ||
			typeof variant.stock !== "number" ||
			variant.stock < 0
		  ) {
			return res.status(400).json({
			  message:
				"Each color must have a valid 'color' and non-negative 'stock'.",
			});
		  }
		  totalStock += variant.stock;
		}
  
		// Set status based on total stock (unless status explicitly provided)
		if (!updates.status) {
		  updateData.status = totalStock > 0 ? "available" : "out_of_stock";
		}
  
		updateData.stock = totalStock;
	  }
  
	  const updatedProduct = await Product.findOneAndUpdate(
		{ title },
		updateData,
		{ new: true }
	  );
  
	  res.status(200).json({
		success: true,
		message: "Product updated by title",
		data: updatedProduct,
	  });
	} catch (err) {
	  console.error(err);
	  res.status(500).json({ message: err.message });
	}
  });

  // GET /api/product/variant/stock?title=Denin&color=brown
router.get('/product/variant/stock', async (req, res) => {
	try {
	  const { title, color } = req.query;
  
	  if (!title || !color) {
		return res.status(400).json({
		  error: "Query parameters 'title' and 'color' are required.",
		});
	  }
  
	  // Find product by title (case-insensitive)
	  const product = await Product.findOne(
		{ title: new RegExp(`^${title}$`, "i") } // Case-insensitive exact match
	  ).lean();
  
	  if (!product) {
		return res.status(404).json({ error: "Product not found." });
	  }
  
	  // Find the specific color variant
	  const variant = product.color.find(c => 
		c.color.toLowerCase() === color.toLowerCase()
	  );
  
	  if (!variant) {
		return res.status(404).json({ 
		  error: `Color variant '${color}' not available for product '${title}'.` 
		});
	  }
  
	  // Return stock for this variant
	  return res.json({
		title: product.title,
		color: variant.color,
		stock: variant.stock,
		size: product.size, // optionally return available sizes
	  });
  
	} catch (err) {
	  console.error("Error fetching variant stock:", err);
	  return res.status(500).json({ error: "Internal server error." });
	}
  });
  

module.exports = router;
