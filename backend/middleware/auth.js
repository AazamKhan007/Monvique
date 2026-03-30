function attachCurrentUser(req, res, next) {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  next();
}

function ensureAuthenticated(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function ensureAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Only admin can perform this action" });
  }

  next();
}

module.exports = {
  attachCurrentUser,
  ensureAuthenticated,
  ensureAdmin,
};
