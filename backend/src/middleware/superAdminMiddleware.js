const superAdminMiddleware = (req, res, next) => {
  if (req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      message: "Super Admin access required",
    });
  }

  next();
};

module.exports = superAdminMiddleware;