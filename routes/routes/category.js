const Category = require("../../models/category");
const Transaction = require("../../models/transaction");
const mongoose = require('mongoose');
const path = require("path");
const PORT = 3007;
const express = require('express');
const router = express.Router();

// const routes = function (app) {
router.get('/category', async function (req, res) {
	try {
		let category = await Category.find().populate('posts').lean()
		console.log('Populated categories with posts:', category);
		res.json(category)
	} catch (err) {
		res.status(500).send(err.message)
	}
});

router.get('/category/:id', async function (req, res) {
	try {
		let { id } = req.params;

		// Validate ID
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ msg: 'Invalid category ID' });
		}

		// Fetch category with populated posts
		let category = await Category.findById(id).populate('posts').lean();

		if (!category) {
			return res.status(404).json({ msg: 'Category not found' });
		}

		// Prepare response data
		let data = {
			name: category.name,
			id: category.id,
			post: category.posts || []
		};

		res.json({ status: 'success', data });
	} catch (err) {
		console.error('Error fetching category:', err.message, err.stack);
		res.status(500).send({ msg: "Server error" });
	}
});


router.put('/category/:id', async function (req, res) {
	try {
		let { id } = req.params
		let category = await Category.findById(id)
		let new_data = {}

		if (!category)
			return res.status(404).json({ msg: "category does not exist", code: 404 });

		new_data = { ...category._doc, ...req.body };

		category.overwrite(new_data);
		await category.save();

		res.json(category)
	} catch (err) {
		res.status(500).send(err.message)
	}
});

router.delete('/category/:id', async function (req, res) {
	try {
		let { id } = req.params
		let category = await Category.findOneAndDelete({ _id: id })

		if (!category) {
			return res.status(404).json({ msg: "category does not exist", code: 404 });
		}

		res.json({ msg: "category deleted" });
	} catch (err) {
		res.status(500).send(err.message);
	}
});

router.post('/category', async (req, res) => {
	try {
		const categoryData = req.body;
		if (typeof categoryData.name === 'string' && categoryData.name.startsWith('{') && categoryData.name.endsWith('}')) {
			try {
				const parsedTitle = JSON.parse(categoryData.name);
				categoryData.name = parsedTitle.name; // Assuming "name" is the property for the actual title
			} catch (err) {
				// Handle parsing error (optional)
			}
		}

		const category = new Category(categoryData);
		await category.save();
		res.json(category);
	} catch (err) {
		res.status(500).send(err.message);
	}
});

// PATCH route to update a category
router.patch('/category/:id', async function (req, res) {
	try {
	  const { id } = req.params;
	  const updatedData = req.body;
  
	  // Validate ID
	  if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ msg: 'Invalid category ID' });
	  }
  
	  // Fetch the category
	  const category = await Category.findById(id);
  
	  if (!category) {
		return res.status(404).json({ msg: 'Category not found' });
	  }
  
	  // Update the category with the new data
	  Object.assign(category, updatedData); // Update only the fields passed in the request body
  
	  // Save the updated category
	  await category.save();
  
	  // Respond with the updated category
	  res.json({ status: 'success', data: category });
	} catch (err) {
	  console.error('Error updating category:', err.message);
	  res.status(500).send({ msg: "Server error" });
	}
  });
  
  router.get('/sales-by-category', async (req, res) => {
	try {
	  const salesData = await Transaction.aggregate([
		{ $unwind: "$metadata.cartItems" },
		{
		  $group: {
			_id: "$metadata.cartItems.category",
			totalSales: {
			  $sum: {
				$multiply: [
				  { $toDouble: "$metadata.cartItems.price" },
				  { $toDouble: "$metadata.cartItems.quantity" }
				]
			  }
			}
		  }
		},
		{
		  $group: {
			_id: null,
			categories: {
			  $push: {
				category: { $ifNull: ["$_id", "Unknown"] },
				sales: "$totalSales"
			  }
			},
			totalSales: { $sum: "$totalSales" }
		  }
		},
		{ $unwind: "$categories" },
		{
		  $project: {
			_id: 0,
			category: "$categories.category",
			sales: "$categories.sales",
			percentage: {
			  $multiply: [
				{ $divide: ["$categories.sales", "$totalSales"] },
				100
			  ]
			}
		  }
		}
	  ]);
  
	  res.json(salesData);
	} catch (err) {
	  console.error('Error fetching sales by category:', err.message);
	  res.status(500).send({ msg: "Server error" });
	}
  });
  
module.exports = router
