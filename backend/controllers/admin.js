const User = require("../models/user");
const Product = require("../models/product");

async function handleGetAnalytics(req, res) {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();

    // Get total products count
    const totalProducts = await Product.countDocuments();

    // Get total orders and revenue from all users' order history
    const users = await User.find().select("name email orderHistory");
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalItemsSold = 0;

    users.forEach((user) => {
      if (user.orderHistory && user.orderHistory.length > 0) {
        totalOrders += user.orderHistory.length;
        user.orderHistory.forEach((order) => {
          totalRevenue += order.totalAmount || 0;
          totalItemsSold += order.totalItems || 0;
        });
      }
    });

    // Get inventory stats (products in stock, low stock, out of stock)
    const inStockCount = await Product.countDocuments({
      availability: "In Stock",
    });
    const lowStockCount = await Product.countDocuments({
      availability: "Low Stock",
    });
    const outOfStockCount = await Product.countDocuments({
      availability: "Out of Stock",
    });

    // Get top selling products
    const topProducts = await Product.find()
      .select("title price category sold rating")
      .limit(5);

    // Get recent orders across all users (not only one latest order per user)
    const recentOrders = [];
    users.forEach((user) => {
      if (!user.orderHistory || user.orderHistory.length === 0) {
        return;
      }

      user.orderHistory.forEach((order) => {
        recentOrders.push({
          userId: user._id,
          userName: user.name || "Unknown User",
          email: user.email || "",
          totalAmount: order.totalAmount || 0,
          totalItems: order.totalItems || 0,
          orderId: order.orderId || "",
          items: Array.isArray(order.items)
            ? order.items.map((item) => ({
                productId: item.productId,
                title: item.title || "Untitled product",
                quantity: item.quantity || 0,
                lineTotal: item.lineTotal || 0,
              }))
            : [],
          date: order.purchasedAt || order.createdAt || null,
        });
      });
    });
    recentOrders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const top10RecentOrders = recentOrders.slice(0, 10);

    return res.json({
      analytics: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        totalItemsSold,
        inventory: {
          inStockCount,
          lowStockCount,
          outOfStockCount,
        },
        topProducts,
        recentOrders: top10RecentOrders,
      },
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return res.status(500).json({ message: "Failed to fetch analytics" });
  }
}

async function handleGetAllUsers(req, res) {
  try {
    const users = await User.find()
      .select("_id name email role created_at")
      .sort({ created_at: -1 });

    return res.json({
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        createdAt: user.created_at,
      })),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
}

async function handleDeleteUser(req, res) {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (id === req.session.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: `User ${deletedUser.email} has been deleted`,
      success: true,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
}

module.exports = {
  handleGetAnalytics,
  handleGetAllUsers,
  handleDeleteUser,
};
