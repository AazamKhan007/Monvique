const User = require("../models/user");

function getSessionUser(req) {
  return req.session?.user || null;
}

async function handleUserSignup(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.create({ name, email, password });

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "user",
    };

    return res.status(201).json({ user: req.session.user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    return res.status(500).json({ message: "Signup failed" });
  }
}

async function handleUserLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "user",
    };

    return res.json({ user: req.session.user });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
}

function handleUserLogout(req, res) {
  const isProduction = process.env.NODE_ENV === "production";
  req.session = null;
  res.clearCookie("monvique.sid", {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  });
  return res.json({ success: true });
}

function handleCurrentUser(req, res) {
  return res.json({ user: getSessionUser(req) });
}

async function handleUpdateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updatedUser = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: `Role updated: ${updatedUser.email} is now ${updatedUser.role}`,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Role update failed" });
  }
}

module.exports = {
  handleUserSignup,
  handleUserLogin,
  handleUserLogout,
  handleCurrentUser,
  handleUpdateUserRole,
};
