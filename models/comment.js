const mongoose = require('mongoose')

 const UserSchema = new mongoose.Schema({
	 comments: [
		{
            comment_user: { type: mongoose.Types.ObjectId, ref: "users" },
		     text: {type: String, required: true},
			 date: {type: Date, default: Date.now},
		 }
	 ],
	date:{type: Date, default:Date.now}
 })

 const Comment = mongoose.model("comments",UserSchema)
 module.exports = Comment;