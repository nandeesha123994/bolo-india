const prisma = require("../config/prisma");

// ==================== GET NOTIFICATIONS ====================

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);

    const skip = (page - 1) * limit;

    // Total notifications
    const totalNotifications = await prisma.notification.count({
      where: {
        userId,
      },
    });

    // Total unread notifications
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    // Get notifications for current page
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      include: {
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalNotifications / limit);

    res.status(200).json({
      notifications,

      pagination: {
        currentPage: page,
        totalPages,
        totalNotifications,
        unreadNotifications,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
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
