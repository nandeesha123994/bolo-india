const prisma = require("../config/prisma");

// ==================== GET NOTIFICATIONS ====================

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    res.status(200).json({
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
};

// ==================== MARK ONE AS READ ====================

const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = Number(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });

    res.status(200).json({
      message: "Notification marked as read",
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Mark notification error:", error);

    res.status(500).json({
      message: "Failed to update notification",
    });
  }
};

// ==================== MARK ALL AS READ ====================

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications error:", error);

    res.status(500).json({
      message: "Failed to update notifications",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
