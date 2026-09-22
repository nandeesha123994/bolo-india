const express = require("express");

const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get logged-in user's notifications
router.get("/", authMiddleware, getNotifications);

// Mark all notifications as read
router.put("/read-all", authMiddleware, markAllNotificationsAsRead);

// Mark one notification as read
router.put("/:id/read", authMiddleware, markNotificationAsRead);

module.exports = router;
