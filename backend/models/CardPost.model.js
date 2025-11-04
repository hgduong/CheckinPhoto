const mongoose = require('mongoose');

const cardPostSchema = new mongoose.Schema({
  author: {
    id: { type: String, default: null },
    name: { type: String, required: true },
    avatar: { type: String, required: true }
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  aiDescription: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
cardPostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CardPost', cardPostSchema);