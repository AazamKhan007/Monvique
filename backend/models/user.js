const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
      },
    ],
    orderHistory: [
      {
        checkoutType: {
          type: String,
          enum: ["cart", "buy-now"],
          required: true,
        },
        paymentId: {
          type: String,
          required: true,
        },
        orderId: {
          type: String,
          default: "",
        },
        totalAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        totalItems: {
          type: Number,
          required: true,
          min: 1,
        },
        items: [
          {
            productId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Product",
              required: true,
            },
            title: {
              type: String,
              required: true,
            },
            category: {
              type: String,
              default: "",
            },
            brand: {
              type: String,
              default: "",
            },
            image: {
              type: String,
              default: "",
            },
            price: {
              type: Number,
              required: true,
              min: 0,
            },
            quantity: {
              type: Number,
              required: true,
              min: 1,
            },
            lineTotal: {
              type: Number,
              required: true,
              min: 0,
            },
          },
        ],
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
