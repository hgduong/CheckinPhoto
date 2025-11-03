// models/Comment.model.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CardPost', required: true },
  author: { name: String, avatar: String },
  text: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
