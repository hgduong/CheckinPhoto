
const mongoose = require("mongoose");
const cardPostSchema = new mongoose.Schema({
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  maps: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("CardPost", cardPostSchema);
