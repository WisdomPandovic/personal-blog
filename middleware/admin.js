const isAdmin = (req, res, next) => {
    if (req.user && req.user.roleName === "admin") {
      next();
    } else {
      res.status(403).json({ message: "Forbidden: Admin access required." });
    }
  };

  module.exports = isAdmin;
