const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireActiveChatUser = require("../middleware/requireActiveChatUser");
const { chatRateLimit } = require("../middleware/chatRateLimit");
const {
  upload: chatImageUpload,
  validateChatImageContent,
} = require("../middleware/chatImageUploadMiddleware");
const {
  createOrGetConversation,
  getChatImage,
  getConversations,
  getConversationMessages,
  markConversationRead,
  requireConversationParticipant,
  uploadChatImage,
} = require("../controllers/chatController");

const router = express.Router();

router.use(authMiddleware, requireActiveChatUser);

router.get("/conversations", getConversations);
router.post("/conversations", createOrGetConversation);

router.get(
  "/conversations/:conversationId/messages",
  requireConversationParticipant,
  getConversationMessages,
);
router.get(
  "/conversations/:conversationId/images/:messageId",
  requireConversationParticipant,
  getChatImage,
);
router.patch(
  "/conversations/:conversationId/read",
  requireConversationParticipant,
  markConversationRead,
);
router.post(
  "/conversations/:conversationId/images",
  chatRateLimit("image"),
  requireConversationParticipant,
  (req, res, next) => {
    chatImageUpload.single("image")(req, res, (error) => {
      if (!error) return next();

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Chat images must be 5MB or smaller",
        });
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          message: "Please upload one image using the image field",
        });
      }

      return res.status(400).json({
        message: error.message || "Invalid image upload",
      });
    });
  },
  validateChatImageContent,
  uploadChatImage,
);

module.exports = router;
