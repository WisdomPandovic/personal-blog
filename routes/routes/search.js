const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const Post = require("../../models/post");
const Contact = require("../../models/contact");

// Universal search endpoint
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query; // Search term from query parameter
    const searchRegex = new RegExp(q, "i"); // Case-insensitive regex

    // Query multiple collections/models
    const users = await User.find({ username: searchRegex });
    const posts = await Post.find({ title: searchRegex });
    const contacts = await Contact.find({ name: searchRegex });

    // Combine results
    const results = {
      users,
      posts,
      contacts,
    };

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
