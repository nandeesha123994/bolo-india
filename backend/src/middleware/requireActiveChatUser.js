const prisma = require("../config/prisma");

const requireActiveChatUser = async (req, res, next) => {
  const userId = req.user?.id;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      message: "Invalid user account",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user) {
      return res.status(401).json({
        message: "User account not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated",
      });
    }

    return next();
  } catch (error) {
    console.error("Check active chat user error:", error);
    return res.status(500).json({
      message: "Unable to verify account status",
    });
  }
};

module.exports = requireActiveChatUser;
