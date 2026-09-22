const prisma = require("../config/prisma");

const createNotification = async ({ userId, type, message, postId = null }) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        postId,
      },
    });

    return notification;
  } catch (error) {
    console.error("Create notification error:", error);

    return null;
  }
};

module.exports = {
  createNotification,
};
