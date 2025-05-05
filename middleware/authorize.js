const VALID_ROLES = ['admin', 'user', 'editor', 'moderator', 'manager', 'support', 'guest'];

const authorizeRoles = (...allowedRoles) => {
  // Filter allowedRoles to only include valid ones
  const filteredRoles = allowedRoles.filter(role => VALID_ROLES.includes(role));

  return (req, res, next) => {
    if (!req.user || !VALID_ROLES.includes(req.user.roleName)) {
      return res.status(403).json({ message: "Forbidden: Invalid role" });
    }

    if (!filteredRoles.includes(req.user.roleName)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

module.exports = authorizeRoles;
