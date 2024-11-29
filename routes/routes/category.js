const Category = require("../../models/category");
const multer = require("multer");
const path = require("path");
const PORT = 3007;
const express = require('express');
const router = express.Router();

// const routes = function (app) {
    router.get('/category', async function(req,res){
		try{
			let category = await Category.find().populate('post').lean()
			console.log('Populated categories with posts:', category);
			res.json(category)
		}catch(err){
			res.status(500).send(err.message)
		}
	});
	  
	router.get('/tag/:id', async function(req,res){
		try{
		 let {id} = req.params
		 let tag = await Tag.findById(id).populate('post');

		 if (!tag) {
			return res.status(404).json({ msg: 'Tag not found' });
		  }
	  
		//   console.log('Fetched tag:', tag);

		 let data = {
			 title: tag.title,
			 id:tag.id,
			 post: tag.post
		 }
		 // console.log(category)
		 res.json(data)
		}catch(err){
			console.error('Error fetching tag:', err);
		    res.status(500).send({msg:"server error"})
		}
	 })

	router.put('/tag/:id', async function(req,res){
		try{
			let {id} = req.params
			let tag = await Tag.findById(id)
            let new_data = {}

            if (!tag)
            return res.status(404).json({msg: "tag does not exist", code:404});

            new_data = {...tag._doc, ...req.body};

            tag.overwrite(new_data);
            await tag.save();

            res.json(tag)
		}catch(err){
			res.status(500).send(err.message)
		}
	});
    
    router.delete('/tag/:id', async function(req,res){
		try{
			let {id} = req.params
			let tag = await Tag.findOneAndDelete({ _id: id })

			if (!tag) {
				return res.status(404).json({ msg: "Tag does not exist", code: 404 });
			  }
		  
			  res.json({ msg: "Tag deleted" });
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