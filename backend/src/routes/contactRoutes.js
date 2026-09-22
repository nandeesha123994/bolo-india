const express = require("express");

const router = express.Router();

const {
  createContactMessage,
  getContactMessages,
  replyToContactMessage,
} = require("../controllers/contactController");

const authMiddleware = require("../middleware/authMiddleware");
const superAdminMiddleware = require("../middleware/superAdminMiddleware");

// ==================== PUBLIC CONTACT FORM ====================

router.post("/", createContactMessage);

// ==================== SUPER ADMIN CONTACT MESSAGES ====================

router.get("/", authMiddleware, superAdminMiddleware, getContactMessages);

// ==================== SUPER ADMIN REPLY ====================

router.put(
  "/:id/reply",
  authMiddleware,
  superAdminMiddleware,
  replyToContactMessage,
);

module.exports = router;
