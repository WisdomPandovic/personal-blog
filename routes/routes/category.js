const Category = require("../../models/category");
const mongoose = require('mongoose');
const path = require("path");
const PORT = 3007;
const express = require('express');
const router = express.Router();

// const routes = function (app) {
router.get('/category', async function (req, res) {
	try {
		let category = await Category.find().populate('post').lean()
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
		let category = await Category.findById(id).populate('post');

		if (!category) {
			return res.status(404).json({ msg: 'Category not found' });
		}

		// Prepare response data
		let data = {
			title: category.title,
			id: category.id,
			post: category.post || []
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


// }
module.exports = router