const express = require("express");
const {
  handleGetAnalytics,
  handleGetAllUsers,
  handleDeleteUser,
} = require("../controllers/admin");
const { ensureAdmin } = require("../middleware/auth");

const router = express.Router();

// All routes require admin authentication
router.use(ensureAdmin);

router.get("/analytics", handleGetAnalytics);
router.get("/users", handleGetAllUsers);
router.delete("/users/:id", handleDeleteUser);

module.exports = router;
