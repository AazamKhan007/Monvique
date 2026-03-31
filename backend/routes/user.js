const express = require("express");
const {
  handleUserSignup,
  handleUserLogin,
  handleUserLogout,
  handleCurrentUser,
  handleUpdateUserRole,
} = require("../controllers/user");
const { ensureAuthenticated, ensureAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/me", handleCurrentUser);
router.post("/signup", handleUserSignup);
router.post("/login", handleUserLogin);
router.post("/logout", handleUserLogout);
router.post("/:id/role", ensureAuthenticated, ensureAdmin, handleUpdateUserRole);

module.exports = router;
