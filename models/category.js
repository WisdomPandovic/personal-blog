const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
	name: {type: String, required:true, trim: true, unique: true},
	post: [{ type: mongoose.Schema.Types.ObjectId, ref: 'posts' }],
})

const Category= mongoose.model("Category",CategorySchema)
module.exports = Category;