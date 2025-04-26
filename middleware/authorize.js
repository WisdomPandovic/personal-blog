const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (req.user && allowedRoles.includes(req.user.role)) {
      return next();
    } else {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
  };
};

module.exports = authorizeRoles;
