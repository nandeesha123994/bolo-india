const express = require("express");

const {
  createSupportMessage,
  getMySupportMessages,
  getAllSupportMessages,
  replyToSupportMessage,
} = require("../controllers/supportController");

const authMiddleware = require("../middleware/authMiddleware");
const moderatorMiddleware = require("../middleware/moderatorMiddleware");

const router = express.Router();

// User sends a support message
router.post("/", authMiddleware, createSupportMessage);

// User gets their own messages
router.get("/my", authMiddleware, getMySupportMessages);

// Moderator gets all support messages
router.get("/", authMiddleware, moderatorMiddleware, getAllSupportMessages);

// Moderator replies
router.put(
  "/:id/reply",
  authMiddleware,
  moderatorMiddleware,
  replyToSupportMessage,
);

module.exports = router;
