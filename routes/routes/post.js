const Post = require("../../models/post");
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
const Like = require("../../models/like");
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
router.get('/post', async function (req, res) {
	try {
		let post = await Post.find().populate("category").populate('user').lean();
		res.json(post)

	} catch (err) {
		res.status(500).send(err.message)
	}
});

// router.get('/post/:id', async function (req, res) {
// 	try {
// 		let { id } = req.params;
// 		let post = await Post.findById(id).populate('category').populate('user')
// 			.populate({
// 				path: 'comments.comment_user',
// 				select: 'username',
// 			})
// 			.populate('comments.text')
// 			.lean();

// 		if (!post) {
// 			return res.status(404).json({ message: 'Post not found' });
// 		};
// 		console.log('Post:', post);
// 		console.log(post.comments)
// 		res.json(post);
// 	} catch (err) {

// 		res.status(500).send(err.message)
// 	}
// });

router.put('/post/:id', async function (req, res) {
	try {
		let { id } = req.params
		let post = await Post.findById(id)
		let new_data = {}

		if (!post)
			return res.status(404).json({ msg: "post does not exist", code: 404 });

		new_data = { ...post._doc, ...req.body };

		post.overwrite(new_data);
		await post.save();

		res.json(post)
	} catch (err) {
		res.status(500).send(err.message)
	}
});

router.delete('/post/:id', async function (req, res) {
	try {
		let { id } = req.params
		let post = await Post.findOneAndDelete({ _id: id });

		if (!post) return res.status(404).json({ msg: "post does not exit", code: 404 });
		res.json({ msg: "Post deleted" })

	} catch (err) {
		res.status(500).send(err.message)
	}
});

router.put('/likes/:id', async (req, res) => {
	try {
		const { id } = req.params;
		console.log('Request received to like post with ID:', id);

		const post = await Post.findById(id);
		console.log('Retrieved post:', post);

		const { user } = req.body;
		console.log('User ID from request body:', user);

		if (!user) {
			return res.status(400).json({ msg: "User ID is required in the request body", code: 400 });
		}

		const USER = await User.findById(user);

		if (!USER) {
			return res.status(404).json({ msg: "User does not exist", code: 404 });
		}

		if (!post) {
			return res.status(404).json({ msg: "Post does not exist", code: 404 });
		}

		const existingLike = await Like.findOne({ user: user, post: id });

		if (existingLike) {
			return res.json({ msg: "Post already liked by this user" });
		}

		const newLike = new Like({ user: user, post: id });
		await newLike.save();

		post.likes.push(newLike);
		await post.save();
		res.json(post.likes);
	} catch (err) {
		console.error(err.message);
		res.status(500).send({ msg: "Internal server error" });
	}
});

router.put('/unlike/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findById(id);
		const { user } = req.body;
		const USER = await User.findById(user);

		if (!USER) {
			return res.status(404).json({ msg: "User does not exist", code: 404 });
		}
		if (!post) {
			return res.status(404).json({ msg: "Post does not exist", code: 404 });
		}

		const existingLike = await Like.findOneAndDelete({ user: USER._id, post: id });
		if (!existingLike) {
			return res.json({ msg: "User has not liked this post" });
		}
		console.log("Existing like removed:", existingLike);

		post.likes = post.likes.filter(like => like.toString() !== existingLike._id.toString());

		const RemoveLike = post.likes.some(like => like.user.toString() === USER);
		//  console.log(RemoveLike)
		post.likes.splice(RemoveLike, 1);
		await post.save();

		res.json(post.likes);

	} catch (err) {
		console.log(err.message);
		res.status(500).send({ msg: "Internal server error" });
	}
});

router.post('/comment/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findById(id).populate('user');

		// Extract the user ID from the object
		const userId = req.body.comment_user.id;

		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ msg: 'Invalid user ID' });
		}

		const newComment = {
			text: req.body.text,
			comment_user: userId, // Use the extracted user ID
		};

		console.log(newComment);
		console.log('comment_user.id:', userId);

		post.comments.unshift(newComment);

		await post.save();
		res.json(post);
		console.log(post);
	} catch (err) {
		console.log(err.message);
		res.status(500).send({ msg: "internal server error" });
	}
});

router.get("/comments", async function (req, res) {
	try {
		const comments = await Post.find()
			.populate('user')
			.populate('comments.comment_user', 'username')
			.select('comments')
			.lean();

		const allComments = comments.flatMap(post => post.comments);

		res.json(allComments);
	} catch (err) {
		res.status(500).send(err.message);
	}
});

router.get('/comment/:id', async (req, res) => {
	try {
		const { id } = req.params;
		let post = await Post.findById(id)
		res.json(post);
	} catch (error) {
		res.status(500).send(error.message);
	}
})

router.post('/reply/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findById(id).populate('user');

		// Extract the user ID from the object
		const userId = req.body.reply_user.id;

		// Validate the user ID
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(400).json({ msg: 'Invalid user ID' });
		}

		// Find the comment ID from the request body
		const { comment_id } = req.body;

		// Find the comment to which the reply will be added
		const comment = post.comments.find(comment => comment._id.toString() === comment_id);

		if (!comment) {
			return res.status(404).json({ msg: 'Comment not found' });
		}

		const newReply = {
			text: req.body.text,
			reply_user: userId, // Use the extracted user ID
		};

		// Add the new reply to the replies array of the comment
		comment.replies.unshift(newReply);

		await post.save();
		res.json(post);
	} catch (err) {
		console.log(err.message);
		res.status(500).send({ msg: "Internal server error" });
	}
});

router.put('/replylikes/:id/:commentId', async (req, res) => {
	try {
		const { id, commentId } = req.params;
		console.log('Request received to like comment with ID:', commentId, 'in post with ID:', id);

		const post = await Post.findById(id);

		if (!post) {
			return res.status(404).json({ msg: "Post does not exist", code: 404 });
		}

		const comment = post.comments.id(commentId);

		if (!comment) {
			return res.status(404).json({ msg: "Comment does not exist", code: 404 });
		}

		const { user } = req.body;
		console.log('User ID from request body:', user);

		if (!user) {
			return res.status(400).json({ msg: "User ID is required in the request body", code: 400 });
		}

		const existingLike = comment.likes.find(like => like.equals(user));

		if (existingLike) {
			return res.json({ msg: "Comment already liked by this user" });
		}

		comment.likes.push(user);
		await post.save();
		res.json(comment.likes);
	} catch (err) {
		console.error(err.message);
		res.status(500).send({ msg: "Internal server error" });
	}
});

router.put('/replyunlikes/:id/:commentId', async (req, res) => {
	try {
		const { id, commentId } = req.params;
		console.log('Request received to unlike comment with ID:', commentId, 'in post with ID:', id);

		const post = await Post.findById(id);

		if (!post) {
			return res.status(404).json({ msg: "Post does not exist", code: 404 });
		}

		const comment = post.comments.id(commentId);

		if (!comment) {
			return res.status(404).json({ msg: "Comment does not exist", code: 404 });
		}

		const { user } = req.body;
		console.log('User ID from request body:', user);

		if (!user) {
			return res.status(400).json({ msg: "User ID is required in the request body", code: 400 });
		}

		const existingLikeIndex = comment.likes.findIndex(like => like.equals(user));

		if (existingLikeIndex === -1) {
			return res.json({ msg: "Comment has not been liked by this user" });
		}

		comment.likes.splice(existingLikeIndex, 1);
		await post.save();
		res.json(comment.likes);
	} catch (err) {
		console.error(err.message);
		res.status(500).send({ msg: "Internal server error" });
	}
});

router.get('/post/category/:categoryId', async (req, res) => {
	try {
		const categoryId = req.params.categoryId;
		const post = await Post.find({ category: categoryId });
		res.json(post);
	} catch (error) {
		res.status(500).json({ error: 'Internal server error' });
	}
});

router.get('/post/:id/views', async (req, res) => {
	try {
		const { id } = req.params;
		console.log('Received ID:', id);

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ err: 'Invalid post ID' });
		}

		const post = await Post.findById(id);
		if (!post) {
			return res.status(404).json({ err: 'Post not found' });
		}

		console.log('Retrieved post:', post);
		console.log('Current view count:', post.views);

		if (typeof post.views !== 'number') {
			console.error('Invalid view count data type');
			return res.status(500).json({ err: 'Invalid view count data type' });
		}

		console.log('View count before increment:', post.views);

		post.views += 1;
		await post.save();

		console.log('View count after increment:', post.views);

		res.json({ viewCount: post.views });
	} catch (err) {
		console.error('Error while fetching post views:', err);
		res.status(500).json({ err: 'Error while fetching post views' });
	}
});

router.post('/post/:id/increment-view', async (req, res) => {
	try {
		const { id } = req.params;
		const post = await Post.findById(id);

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ err: 'Invalid post ID' });
		}

		if (!post) {
			return res.status(404).json({ err: 'Post not found' });
		}

		if (!post.viewsIncremented) {
			post.views += 1;
			post.viewsIncremented = true;
			await post.save();
		}

		res.json({ viewCount: post.views });
	} catch (err) {
		console.error('Error while incrementing post views:', err);
		res.status(500).json({ err: 'Error while incrementing post views' });
	}
});

router.get('/posts-with-users', async function (req, res) {
	try {
		let postsWithUsers = await Post.find()
			.populate('user')
			.populate('comments.comment_user')
			.lean();

		res.json(postsWithUsers);
	} catch (err) {
		res.status(500).send(err.message);
	}
});

// router.post('/post', postimage.any(), async function (req, res) {
// 	try {
// 		console.log('Received request body:', req.body);
// 		console.log('Received files:', req.files);

// 		const { title, header, location, content, price, category, user } = req.body;

// 		// Ensure all required fields are provided
// 		if (!title) {
// 			return res.status(400).json({ message: "Title is required." });
// 		}
// 		if (!header) {
// 			return res.status(400).json({ message: "Header is required." });
// 		}
// 		if (!content) {
// 			return res.status(400).json({ message: "Content is required." });
// 		}
// 		if (!price) {
// 			return res.status(400).json({ message: "Price is required." });
// 		}
// 		if (!category) {
// 			return res.status(400).json({ message: "Category is required." });
// 		}
// 		if (!user) {
// 			return res.status(400).json({ message: "User is required." });
// 		}

// 		// Validate user ID
// 		if (!ObjectId.isValid(user)) {
// 			return res.status(400).json({ msg: 'Invalid user ID' });
// 		}

// 		const foundUser = await User.findById(user);
// 		if (!foundUser) {
// 			return res.status(404).json({ msg: 'User not found' });
// 		}

// 		if (foundUser.role !== 'admin') {
// 			return res.status(403).json({ msg: 'Only admins can create posts' });
// 		}

// 		// Validate category
// 		if (!ObjectId.isValid(category)) {
// 			return res.status(400).json({ msg: 'Invalid category ID' });
// 		}

// 		const foundCategory = await Category.findById(category);
// 		if (!foundCategory) {
// 			return res.status(404).json({ msg: 'Category not found' });
// 		}

// 		// Ensure we have the files and handle them
// 		let imagePaths = [];  // Store multiple images
// 		let videoPath = "";   // Store one video

// 		if (req.files && req.files.length > 0) {
// 			req.files.forEach(file => {
// 				if (file.fieldname === 'image[]') {
// 					imagePaths.push(FILE_PATH + file.filename); // Store multiple images
// 				} else if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
// 					if (videoPath) {
// 						return res.status(400).json({ msg: 'Only one video is allowed.' }); // Allow only one video
// 					}
// 					videoPath = FILE_PATH + file.filename; // Store one video
// 				}
// 			});
// 		}

// 		if (imagePaths.length === 0) {
// 			return res.status(400).json({ msg: 'At least one image is required.' });
// 		}
// 		if (!videoPath) {
// 			return res.status(400).json({ msg: 'At least one video is required.' });
// 		}

// 		// Create a new post
// 		const newPost = new Post({
// 			title,
// 			images: imagePaths,   // Store multiple images
// 			video: videoPath,     // Store one video
// 			header,
// 			location,
// 			content,
// 			price,
// 			category,
// 			user,
// 		});

// 		await newPost.save();

// 		// Update category with the new post ID
// 		await Category.findByIdAndUpdate(category, { $push: { posts: newPost._id } });

// 		res.status(200).json({
// 			success: true,
// 			message: 'Post created successfully',
// 			data: newPost,
// 		});
// 	} catch (err) {
// 		console.error('Error creating post:', err);
// 		res.status(500).json({ success: false, message: err.message });
// 	}
// });

router.post("/post", async function (req, res) {
	try {
		console.log("Received request body:", req.body);

		const { title, header, location, content, price, category, user, images, video, tag } = req.body;

		// Ensure all required fields are provided
		if (!title) {
			return res.status(400).json({ message: "Title is required." });
		}
		if (!header) {
			return res.status(400).json({ message: "Header is required." });
		}
		if (!content) {
			return res.status(400).json({ message: "Content is required." });
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
		const newPost = new Post({
			title,
			images: imagePaths, // Accepting image URLs
			video,              // Accepting video URL
			header,
			location,
			content,
			price,
			category,
			user,
			tag
		});

		await newPost.save();

		// Update category with the new post ID
		await Category.findByIdAndUpdate(category, { $push: { posts: newPost._id } });

		res.status(200).json({
			success: true,
			message: "Post created successfully",
			data: newPost,
		});
	} catch (err) {
		console.error("Error creating post:", err);
		res.status(500).json({ success: false, message: err.message });
	}
});


router.get('/post/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;  // Access the decoded userId from the token

        if (!id) {
            return res.status(400).json({ message: 'Post ID is required' });
        }

        // Fetch the post by ID and populate its details (category, user, comments, etc.)
        let post = await Post.findById(id)
            .populate('category')      // Populate category information
            .populate('user')          // Populate user information (author of the post)
            .populate({
                path: 'comments.comment_user', // Populate comment user's info
                select: 'username',  // Only return the username of the comment author
            })
            .lean();  // Convert the mongoose document to plain JavaScript object

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

		 // Fetch the user to check if they are an admin
		 const user = await User.findById(userId);
		 if (!user) {
			 return res.status(403).json({ message: 'User not found' });
		 }
 
		 // Allow admin to view the post without payment
		 if (user.role === 'admin') {
			 return res.status(200).json(post); // Admin can view the post
		 }

        // Check if the post is paid
        if (post.paid) {
            const user = await User.findById(userId);
            const hasPaidForPost = user.paidPosts.some((paidPostId) => paidPostId.toString() === id.toString());

            if (!hasPaidForPost) {
                return res.status(403).json({ message: 'You need to pay for this post first' });
            }
        }

        res.status(200).json(post);  // Send the post data

    } catch (err) {
        console.error('Error fetching post:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

module.exports = router;