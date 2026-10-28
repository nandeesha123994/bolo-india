const fs = require("node:fs/promises");
const path = require("node:path");
const prisma = require("../config/prisma");
const {
  broadcastConversationEvent,
  broadcastChatMessage,
  createChatMessage,
  deleteChatMessageForEveryone,
  deleteChatMessageForUser,
  editChatMessage,
  getConversationForParticipant,
  markMessagesRead,
  messageSelection,
  serializeChatMessage,
} = require("../services/chatService");

const MAX_MESSAGE_LENGTH = 5000;
const privateChatImageDirectory = path.resolve(
  __dirname,
  "../../private-chat-uploads",
);
const privateImageNamePattern =
  /^\d+-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/i;

const userSelection = {
  id: true,
  name: true,
  profileImage: true,
  lastSeenAt: true,
};

const requireConversationParticipant = async (req, res, next) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const conversation = await getConversationForParticipant(
      conversationId,
      req.user.id,
    );

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    req.conversation = conversation;
    return next();
  } catch (error) {
    console.error("Check chat conversation access error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const createOrGetConversation = async (req, res) => {
  try {
    const otherUserId = Number(req.body.userId);
    const currentUserId = req.user.id;

    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({
        message: "A valid user ID is required",
      });
    }

    if (otherUserId === currentUserId) {
      return res.status(400).json({
        message: "You cannot start a conversation with yourself",
      });
    }

    const otherUser = await prisma.user.findFirst({
      where: { id: otherUserId, isActive: true },
      select: userSelection,
    });

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const [firstUserId, secondUserId] = [currentUserId, otherUserId].sort(
      (left, right) => left - right,
    );

    const conversation = await prisma.chatConversation.upsert({
      where: {
        firstUserId_secondUserId: { firstUserId, secondUserId },
      },
      create: { firstUserId, secondUserId },
      update: {},
      select: {
        id: true,
        firstUserId: true,
        secondUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      conversation: {
        ...conversation,
        otherUser,
      },
    });
  } catch (error) {
    console.error("Create or get chat conversation error:", error);
    return res.status(500).json({
      message: "Unable to start conversation",
    });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await prisma.chatConversation.findMany({
      where: {
        OR: [{ firstUserId: userId }, { secondUserId: userId }],
      },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        firstUserId: true,
        secondUserId: true,
        lastMessageAt: true,
        firstUser: { select: userSelection },
        secondUser: { select: userSelection },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          where: { hiddenFor: { none: { userId } } },
          select: messageSelection,
        },
      },
    });

    const results = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            readAt: null,
            deletedAt: null,
            hiddenFor: { none: { userId } },
          },
        });

        const otherUser =
          conversation.firstUserId === userId
            ? conversation.secondUser
            : conversation.firstUser;

        return {
          id: conversation.id,
          otherUser,
          lastMessageAt: conversation.lastMessageAt,
          lastMessage: conversation.messages[0]
            ? serializeChatMessage(conversation.messages[0])
            : null,
          unreadCount,
        };
      }),
    );

    return res.status(200).json({ conversations: results });
  } catch (error) {
    console.error("Get chat conversations error:", error);
    return res.status(500).json({
      message: "Unable to load conversations",
    });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 30, 1),
      100,
    );
    const where = {
      conversationId: req.conversation.id,
      hiddenFor: { none: { userId: req.user.id } },
    };
    const [totalMessages, descendingMessages] = await Promise.all([
      prisma.chatMessage.count({ where }),
      prisma.chatMessage.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: messageSelection,
      }),
    ]);
    const totalPages = Math.ceil(totalMessages / limit);

    return res.status(200).json({
      messages: descendingMessages.reverse().map(serializeChatMessage),
      pagination: {
        currentPage: page,
        totalPages,
        totalMessages,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && page <= totalPages,
      },
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    return res.status(500).json({
      message: "Unable to load chat history",
    });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const result = await markMessagesRead(req.conversation.id, req.user.id);
    const io = req.app.get("io");
    const senderId =
      req.conversation.firstUserId === req.user.id
        ? req.conversation.secondUserId
        : req.conversation.firstUserId;

    if (result.messageIds.length > 0 && io) {
      io.to(`user:${senderId}`).emit("message:read", {
        conversationId: req.conversation.id,
        readerId: req.user.id,
        messageIds: result.messageIds,
        readAt: result.readAt,
        deliveredAt: result.deliveredAt,
        messages: result.messages,
      });
    }

    return res.status(200).json({
      message: "Conversation marked as read",
      ...result,
    });
  } catch (error) {
    console.error("Mark chat messages read error:", error);
    return res.status(500).json({
      message: "Unable to mark conversation as read",
    });
  }
};

const editMessage = async (req, res) => {
  const messageId = Number(req.params.messageId);
  const content =
    typeof req.body?.content === "string" ? req.body.content.trim() : "";

  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ message: "Invalid message ID" });
  }
  if (!content || content.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      message: `Message must contain 1 to ${MAX_MESSAGE_LENGTH} characters`,
    });
  }

  try {
    const message = await editChatMessage({
      conversationId: req.conversation.id,
      messageId,
      senderId: req.user.id,
      content,
    });
    if (!message) {
      return res.status(404).json({
        message: "Message not found or cannot be edited",
      });
    }

    broadcastConversationEvent(req.app.get("io"), req.conversation, "message:updated", {
      conversationId: req.conversation.id,
      message,
    });
    return res.status(200).json({ message });
  } catch (error) {
    console.error("Edit chat message error:", error);
    return res.status(500).json({ message: "Unable to edit message" });
  }
};

const deleteMessageForMe = async (req, res) => {
  const messageId = Number(req.params.messageId);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ message: "Invalid message ID" });
  }

  try {
    const deleted = await deleteChatMessageForUser({
      conversationId: req.conversation.id,
      messageId,
      userId: req.user.id,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Message not found" });
    }

    const payload = {
      conversationId: req.conversation.id,
      messageId,
      userId: req.user.id,
    };
    req.app.get("io")?.to(`user:${req.user.id}`).emit(
      "message:deleted-for-me",
      payload,
    );
    return res.status(200).json({ message: "Message deleted for you" });
  } catch (error) {
    console.error("Delete chat message for user error:", error);
    return res.status(500).json({ message: "Unable to delete message" });
  }
};

const deleteMessageForEveryone = async (req, res) => {
  const messageId = Number(req.params.messageId);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ message: "Invalid message ID" });
  }

  try {
    const message = await deleteChatMessageForEveryone({
      conversationId: req.conversation.id,
      messageId,
      senderId: req.user.id,
    });
    if (!message) {
      return res.status(404).json({
        message: "Message not found or cannot be deleted",
      });
    }

    broadcastConversationEvent(
      req.app.get("io"),
      req.conversation,
      "message:deleted",
      { conversationId: req.conversation.id, message },
    );
    return res.status(200).json({ message });
  } catch (error) {
    console.error("Delete chat message for everyone error:", error);
    return res.status(500).json({ message: "Unable to delete message" });
  }
};

const uploadChatImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please select an image to send",
    });
  }

  try {
    const message = await createChatMessage({
      conversationId: req.conversation.id,
      senderId: req.user.id,
      image: req.file.filename,
    });
    const io = req.app.get("io");

    broadcastChatMessage(io, req.conversation, message);

    return res.status(201).json({ message });
  } catch (error) {
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error("Could not remove failed chat image upload:", cleanupError);
      }
    }

    console.error("Create image chat message error:", error);
    return res.status(500).json({
      message: "Unable to send image",
    });
  }
};

const getChatImage = async (req, res) => {
  const messageId = Number(req.params.messageId);

  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(404).json({
      message: "Image not found",
    });
  }

  try {
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        conversationId: req.conversation.id,
        image: { not: null },
        deletedAt: null,
        hiddenFor: { none: { userId: req.user.id } },
      },
      select: { image: true },
    });

    if (!message || !privateImageNamePattern.test(message.image)) {
      return res.status(404).json({
        message: "Image not found",
      });
    }

    const imagePath = path.resolve(privateChatImageDirectory, message.image);
    if (path.dirname(imagePath) !== privateChatImageDirectory) {
      return res.status(404).json({
        message: "Image not found",
      });
    }

    await fs.access(imagePath);
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");

    return res.sendFile(imagePath, (error) => {
      if (!error) return;
      if (res.headersSent) {
        console.error("Send chat image error:", error);
        return;
      }

      if (error.code === "ENOENT") {
        return res.status(404).json({
          message: "Image not found",
        });
      }

      console.error("Send chat image error:", error);
      return res.status(500).json({
        message: "Unable to load image",
      });
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        message: "Image not found",
      });
    }

    console.error("Get chat image error:", error);
    return res.status(500).json({
      message: "Unable to load image",
    });
  }
};

module.exports = {
  createOrGetConversation,
  getConversations,
  getConversationMessages,
  editMessage,
  deleteMessageForMe,
  deleteMessageForEveryone,
  markConversationRead,
  requireConversationParticipant,
  getChatImage,
  uploadChatImage,
};
