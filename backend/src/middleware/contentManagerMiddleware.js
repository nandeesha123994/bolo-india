const contentManagerMiddleware = (req, res, next) => {
  if (
    req.user.role !== "CONTENT_MANAGER" &&
    req.user.role !== "ADMIN" &&
    req.user.role !== "SUPER_ADMIN"
  ) {
    return res.status(403).json({
      message: "Content Manager access required",
    });
  }

  next();
};

module.exports = contentManagerMiddleware;
