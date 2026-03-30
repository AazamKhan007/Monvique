const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxLength: 100,
  },
  description: {
    type: String,
    maxLength: 200,
    default: "",
  },
  category: {
    type: String,
    required: true,
    maxLength: 50,
  },
  brand: {
    type: String,
    required: true,
    maxLength: 50,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  availability: {
    type: String,
    required: true,
    enum: ["In Stock", "Out of Stock", "Low Stock"],
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  image: {
    type: String,
    default: "",
  },
  created_at: {
    type: Date,
    required: true,
  },
  updated_at: {
    type: Date,
    default: null,
  },
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
