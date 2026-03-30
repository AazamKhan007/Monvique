const Product = require("../models/product");
const User = require("../models/user");

function isAdmin(req) {
  return Boolean(req.session?.user?.role === "admin");
}

function isUser(req) {
  return Boolean(req.session?.user?.role === "user");
}

function sanitizeQuantity(rawValue) {
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function getUserWithCart(userId) {
  if (!userId) {
    return null;
  }

  return User.findById(userId).populate("cart.product");
}

function getPreparedCartItems(user) {
  if (!user || !Array.isArray(user.cart)) {
    return [];
  }

  return user.cart.filter((item) => item.product);
}

async function handleGetAllProducts(req, res) {
  try {
    const query = (req.query.q || "").trim();
    const filter = query
      ? {
          $or: [
            { title: { $regex: query, $options: "i" } },
            { category: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } },
          ],
        }
      : {};

    const products = await Product.find(filter).sort({ created_at: -1 });
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch products" });
  }
}

async function handleGetProductDetail(req, res) {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let currentQuantity = 1;
    if (isUser(req)) {
      const user = await getUserWithCart(req.session.user.id);
      const existingItem = user?.cart?.find((item) => String(item.product?._id) === String(id));
      currentQuantity = existingItem ? existingItem.quantity : 1;
    }

    return res.json({ product, currentQuantity });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch product detail" });
  }
}

async function createNewProduct(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admin can create product" });
  }

  try {
    const { title, description, category, brand, price, discount, availability } = req.body;
    const newProduct = new Product({
      title,
      description,
      category,
      brand,
      price,
      discount,
      availability,
      image: req.file ? `/uploads/${req.file.filename}` : "",
      created_at: new Date(),
    });

    await newProduct.save();
    return res.status(201).json({ product: newProduct });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create product" });
  }
}

async function handleUpdateProductById(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admin can update product" });
  }

  try {
    const { id } = req.params;
    const { title, description, category, brand, price, discount, availability } = req.body;
    const updateData = { title, description, category, brand, price, discount, availability, updated_at: new Date() };

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      runValidators: true,
      new: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ product: updatedProduct });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update product" });
  }
}

async function handleDeleteProductById(req, res) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admin can delete product" });
  }

  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete product" });
  }
}

async function handleUpsertCartItem(req, res) {
  if (!isUser(req)) {
    return res.status(403).json({ message: "Only users can add items to cart" });
  }

  try {
    const { id } = req.params;
    const quantity = sanitizeQuantity(req.body.quantity);

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingItem = user.cart.find((item) => String(item.product) === String(id));
    if (existingItem) {
      existingItem.quantity = quantity;
    } else {
      user.cart.push({ product: id, quantity });
    }

    await user.save();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update cart" });
  }
}

async function handleBuyNow(req, res) {
  if (!isUser(req)) {
    return res.status(403).json({ message: "Only users can buy products" });
  }

  try {
    const { id } = req.params;
    const quantity = sanitizeQuantity(req.body.quantity);

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.cart = [];
    await user.save();

    return res.json({
      checkoutType: "buy-now",
      itemCount: quantity,
      totalAmount: quantity * product.price,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: "Buy now failed" });
  }
}

async function handleGetCart(req, res) {
  if (!isUser(req)) {
    return res.status(403).json({ message: "Only users can view cart" });
  }

  try {
    const user = await getUserWithCart(req.session.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cartItems = getPreparedCartItems(user);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    return res.json({
      cartItems,
      totalItems,
      totalAmount,
      cartCount: cartItems.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch cart" });
  }
}

async function handleUpdateCartQuantity(req, res) {
  if (!isUser(req)) {
    return res.status(403).json({ message: "Only users can update cart" });
  }

  try {
    const { productId } = req.params;
    const user = await User.findById(req.session.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingItem = user.cart.find((item) => String(item.product) === String(productId));
    if (!existingItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    const action = req.body.action;
    if (action === "increment") {
      existingItem.quantity += 1;
    } else if (action === "decrement") {
      existingItem.quantity = Math.max(1, existingItem.quantity - 1);
    } else {
      existingItem.quantity = sanitizeQuantity(req.body.quantity);
    }

    await user.save();

    const productIds = user.cart.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select("_id price");
    const priceById = new Map(products.map((product) => [String(product._id), product.price]));

    const totalItems = user.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = user.cart.reduce((sum, item) => {
      const price = priceById.get(String(item.product)) || 0;
      return sum + (price * item.quantity);
    }, 0);

    return res.json({
      productId,
      quantity: existingItem.quantity,
      totalItems,
      totalAmount,
      cartCount: user.cart.length,
    });
  } catch (error) {
    console.error("Cart quantity update failed:", error);
    return res.status(500).json({ message: "Cart quantity update failed" });
  }
}

async function handleRemoveCartItem(req, res) {
  if (!isUser(req)) {
    return res.status(403).json({ message: "Only users can update cart" });
  }

  try {
    const { productId } = req.params;
    const user = await User.findById(req.session.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.cart = user.cart.filter((item) => String(item.product) !== String(productId));
    await user.save();

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove cart item" });
  }
}

async function handleCheckout(req, res) {
  if (!isUser(req)) {
    return res.status(403).json({ message: "Only users can checkout" });
  }

  try {
    const user = await getUserWithCart(req.session.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cartItems = getPreparedCartItems(user);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    user.cart = [];
    await user.save();

    return res.json({
      checkoutType: "cart",
      itemCount: totalItems,
      totalAmount,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: "Checkout failed" });
  }
}

module.exports = {
  handleGetAllProducts,
  handleGetProductDetail,
  createNewProduct,
  handleUpdateProductById,
  handleDeleteProductById,
  handleUpsertCartItem,
  handleBuyNow,
  handleGetCart,
  handleUpdateCartQuantity,
  handleRemoveCartItem,
  handleCheckout,
};
