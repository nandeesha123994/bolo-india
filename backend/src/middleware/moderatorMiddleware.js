const moderatorMiddleware = (req, res, next) => {
  if (
    req.user.role !== "MODERATOR" &&
    req.user.role !== "ADMIN" &&
    req.user.role !== "SUPER_ADMIN"
  ) {
    return res.status(403).json({
      message: "Moderator access required",
    });
  }

  next();
};

module.exports = moderatorMiddleware;
