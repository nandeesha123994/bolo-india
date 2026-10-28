const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const prisma = require("../config/prisma");
const {
  broadcastChatMessage,
  createChatMessage,
  getConversationForParticipant,
  markMessagesDelivered,
  markMessagesRead,
} = require("./chatService");
const { consumeChatRateLimit } = require("../middleware/chatRateLimit");

const MAX_MESSAGE_LENGTH = 5000;
const PRESENCE_DISCONNECT_GRACE_MS = 1500;

const getAllowedOrigins = () => {
  const configuredOrigins = process.env.CHAT_ALLOWED_ORIGINS;
  if (!configuredOrigins) {
    throw new Error(
      "CHAT_ALLOWED_ORIGINS must contain the allowed frontend origins",
    );
  }

  const origins = configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error(
      "CHAT_ALLOWED_ORIGINS must contain the allowed frontend origins",
    );
  }

  return origins.map((origin) => {
    let parsedOrigin;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error(`Invalid frontend origin in CHAT_ALLOWED_ORIGINS: ${origin}`);
    }

    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== origin
    ) {
      throw new Error(`Invalid frontend origin in CHAT_ALLOWED_ORIGINS: ${origin}`);
    }

    return parsedOrigin.origin;
  });
};

const isPositiveInteger = (value) =>
  Number.isInteger(Number(value)) && Number(value) > 0;

const acknowledgeError = (acknowledge, message) => {
  if (typeof acknowledge === "function") {
    acknowledge({ ok: false, message });
  }
};

const initializeChatSocket = (httpServer, app) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOriginSet = new Set(allowedOrigins);
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      callback(null, typeof origin === "string" && allowedOriginSet.has(origin));
    },
  });
  // Presence and rate limits are process-local; run one backend instance until shared state is configured.
  const onlineSockets = new Map();
  const pendingOfflineTimers = new Map();
  const typingSockets = new Map();

  io.use(async (socket, next) => {
    let decoded;
    try {
      const suppliedToken = socket.handshake.auth?.token;
      const token =
        typeof suppliedToken === "string"
          ? suppliedToken.replace(/^Bearer\s+/i, "")
          : "";

      if (!token) {
        return next(new Error("Authentication required"));
      }

      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error("Invalid or expired token"));
    }

    if (!Number.isInteger(decoded?.id) || decoded.id <= 0) {
      return next(new Error("Invalid or expired token"));
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error("Invalid or inactive account"));
      }

      socket.data.userId = user.id;
      return next();
    } catch (error) {
      console.error("Socket authentication account lookup error:", error);
      return next(new Error("Unable to authenticate connection"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    const userRoom = `user:${userId}`;
    const typingConversations = new Set();
    const typingEventVersions = new Map();

    try {
      await socket.join(userRoom);
    } catch (error) {
      console.error("Socket user room join error:", error);
      socket.disconnect(true);
      return;
    }

    if (!socket.connected) return;

    const currentSockets = onlineSockets.get(userId) || new Set();
    const pendingOfflineTimer = pendingOfflineTimers.get(userId);
    if (pendingOfflineTimer) {
      clearTimeout(pendingOfflineTimer);
      pendingOfflineTimers.delete(userId);
    }
    currentSockets.add(socket.id);
    onlineSockets.set(userId, currentSockets);

    if (currentSockets.size === 1) {
      io.emit("presence:update", { userId, status: "online" });
    }

    const ensureActiveAccount = async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { isActive: true },
        });

        if (user?.isActive) return true;

        socket.emit("chat:error", {
          message: "Your account is no longer active.",
        });
        socket.disconnect(true);
        return false;
      } catch (error) {
        console.error("Socket active-account check error:", error);
        socket.emit("chat:error", {
          message: "Unable to verify your account status.",
        });
        socket.disconnect(true);
        return false;
      }
    };

    socket.on("presence:list", async (acknowledge) => {
      if (!(await ensureActiveAccount())) return;
      if (typeof acknowledge === "function") {
        acknowledge({
          ok: true,
          onlineUserIds: Array.from(onlineSockets.keys()),
        });
      }
    });

    socket.on("conversation:join", async (payload, acknowledge) => {
      const conversationId = Number(payload?.conversationId);

      try {
        if (!(await ensureActiveAccount())) return;
        if (!isPositiveInteger(conversationId)) {
          return acknowledgeError(acknowledge, "Invalid conversation ID");
        }

        const conversation = await getConversationForParticipant(
          conversationId,
          userId,
        );
        if (!conversation) {
          return acknowledgeError(acknowledge, "Conversation not found");
        }

        const peerId =
          conversation.firstUserId === userId
            ? conversation.secondUserId
            : conversation.firstUserId;
        const room = `conversation:${conversationId}`;

        await socket.join(room);
        socket.emit("presence:update", {
          userId: peerId,
          status: onlineSockets.has(peerId) ? "online" : "offline",
        });

        if (typeof acknowledge === "function") {
          acknowledge({ ok: true });
        }
      } catch (error) {
        console.error("Socket join conversation error:", error);
        acknowledgeError(acknowledge, "Unable to join conversation");
      }
    });

    socket.on("message:send", async (payload, acknowledge) => {
      const conversationId = Number(payload?.conversationId);
      const content =
        typeof payload?.content === "string" ? payload.content.trim() : "";

      try {
        if (!(await ensureActiveAccount())) return;
        if (!isPositiveInteger(conversationId)) {
          return acknowledgeError(acknowledge, "Invalid conversation ID");
        }
        if (!content || content.length > MAX_MESSAGE_LENGTH) {
          return acknowledgeError(
            acknowledge,
            `Message must contain 1 to ${MAX_MESSAGE_LENGTH} characters`,
          );
        }

        const rateLimit = consumeChatRateLimit(userId, "message");
        if (!rateLimit.allowed) {
          return acknowledgeError(
            acknowledge,
            `Too many messages. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
          );
        }

        const conversation = await getConversationForParticipant(
          conversationId,
          userId,
        );
        if (!conversation) {
          return acknowledgeError(acknowledge, "Conversation not found");
        }

        const message = await createChatMessage({
          conversationId,
          senderId: userId,
          content,
        });

        broadcastChatMessage(io, conversation, message);

        if (typeof acknowledge === "function") {
          acknowledge({ ok: true, message });
        }
      } catch (error) {
        console.error("Socket send message error:", error);
        acknowledgeError(acknowledge, "Unable to send message");
      }
    });

    socket.on("message:delivered", async (payload, acknowledge) => {
      const conversationId = Number(payload?.conversationId);
      const rawMessageIds = payload?.messageIds;
      const messageIds = Array.isArray(rawMessageIds)
        ? [...new Set(rawMessageIds.map(Number))]
        : [];

      try {
        if (!(await ensureActiveAccount())) return;
        if (!isPositiveInteger(conversationId)) {
          return acknowledgeError(acknowledge, "Invalid conversation ID");
        }
        if (
          messageIds.length === 0 ||
          messageIds.length > 100 ||
          messageIds.some((messageId) => !isPositiveInteger(messageId))
        ) {
          return acknowledgeError(acknowledge, "Invalid delivered message IDs");
        }

        const conversation = await getConversationForParticipant(
          conversationId,
          userId,
        );
        if (!conversation) {
          return acknowledgeError(acknowledge, "Conversation not found");
        }

        const messages = await markMessagesDelivered(
          conversationId,
          userId,
          messageIds,
        );
        const messagesBySender = new Map();
        for (const message of messages) {
          const senderMessages = messagesBySender.get(message.senderId) || [];
          senderMessages.push(message);
          messagesBySender.set(message.senderId, senderMessages);
        }

        for (const [senderId, senderMessages] of messagesBySender) {
          io.to(`user:${senderId}`).emit("message:delivered", {
            conversationId,
            messages: senderMessages,
          });
        }

        if (typeof acknowledge === "function") {
          acknowledge({ ok: true, messages });
        }
      } catch (error) {
        console.error("Socket delivery receipt error:", error);
        acknowledgeError(acknowledge, "Unable to update delivery status");
      }
    });

    const broadcastTyping = async (payload, isTyping, acknowledge) => {
      const conversationId = Number(payload?.conversationId);
      if (!isPositiveInteger(conversationId)) {
        return acknowledgeError(acknowledge, "Invalid conversation ID");
      }

      const eventVersion = (typingEventVersions.get(conversationId) || 0) + 1;
      typingEventVersions.set(conversationId, eventVersion);

      try {
        if (!(await ensureActiveAccount())) return;

        if (isTyping) {
          const rateLimit = consumeChatRateLimit(userId, "typing:start");
          if (!rateLimit.allowed) {
            const message = `Too many typing events. Try again in ${rateLimit.retryAfterSeconds} seconds.`;
            if (typeof acknowledge === "function") {
              return acknowledgeError(acknowledge, message);
            }
            socket.emit("chat:error", { message });
            return;
          }
        }

        const conversation = await getConversationForParticipant(
          conversationId,
          userId,
        );
        if (!conversation) {
          return acknowledgeError(acknowledge, "Conversation not found");
        }

        if (
          typingEventVersions.get(conversationId) !== eventVersion ||
          !socket.connected
        ) {
          if (typeof acknowledge === "function") {
            acknowledge({ ok: true });
          }
          return;
        }

        const room = `conversation:${conversationId}`;
        await socket.join(room);
        if (
          typingEventVersions.get(conversationId) !== eventVersion ||
          !socket.connected
        ) {
          if (typeof acknowledge === "function") {
            acknowledge({ ok: true });
          }
          return;
        }

        const typingKey = `${conversationId}:${userId}`;
        if (isTyping) {
          const activeSockets = typingSockets.get(typingKey) || new Set();
          const wasTyping = activeSockets.size > 0;
          activeSockets.add(socket.id);
          typingSockets.set(typingKey, activeSockets);
          typingConversations.add(conversationId);
          if (!wasTyping) {
            io.to(room).except(userRoom).emit("typing:update", {
              conversationId,
              userId,
              isTyping: true,
            });
          }
        } else {
          const activeSockets = typingSockets.get(typingKey);
          activeSockets?.delete(socket.id);
          const isStillTyping = Boolean(activeSockets?.size);
          if (!isStillTyping) {
            typingSockets.delete(typingKey);
          }
          typingConversations.delete(conversationId);
          if (!isStillTyping) {
            io.to(room).except(userRoom).emit("typing:update", {
              conversationId,
              userId,
              isTyping: false,
            });
          }
        }

        if (typeof acknowledge === "function") {
          acknowledge({ ok: true });
        }
      } catch (error) {
        console.error("Socket typing event error:", error);
        acknowledgeError(acknowledge, "Unable to update typing status");
      }
    };

    socket.on("typing:start", (payload, acknowledge) =>
      broadcastTyping(payload, true, acknowledge),
    );
    socket.on("typing:stop", (payload, acknowledge) =>
      broadcastTyping(payload, false, acknowledge),
    );

    socket.on("message:read", async (payload, acknowledge) => {
      const conversationId = Number(payload?.conversationId);

      try {
        if (!(await ensureActiveAccount())) return;
        if (!isPositiveInteger(conversationId)) {
          return acknowledgeError(acknowledge, "Invalid conversation ID");
        }

        const conversation = await getConversationForParticipant(
          conversationId,
          userId,
        );
        if (!conversation) {
          return acknowledgeError(acknowledge, "Conversation not found");
        }

        const result = await markMessagesRead(conversationId, userId);
        if (result.messageIds.length > 0) {
          const senderId =
            conversation.firstUserId === userId
              ? conversation.secondUserId
              : conversation.firstUserId;
          io.to(`user:${senderId}`).emit("message:read", {
            conversationId,
            readerId: userId,
            messageIds: result.messageIds,
            readAt: result.readAt,
            deliveredAt: result.deliveredAt,
            messages: result.messages,
          });
        }

        if (typeof acknowledge === "function") {
          acknowledge({ ok: true, ...result });
        }
      } catch (error) {
        console.error("Socket read receipt error:", error);
        acknowledgeError(acknowledge, "Unable to mark messages as read");
      }
    });

    socket.on("disconnect", () => {
      for (const conversationId of typingConversations) {
        const typingKey = `${conversationId}:${userId}`;
        const activeSockets = typingSockets.get(typingKey);
        activeSockets?.delete(socket.id);
        const isStillTyping = Boolean(activeSockets?.size);
        if (!isStillTyping) {
          typingSockets.delete(typingKey);
          io.to(`conversation:${conversationId}`)
            .except(userRoom)
            .emit("typing:update", {
              conversationId,
              userId,
              isTyping: false,
            });
        }
      }
      typingConversations.clear();

      const socketsForUser = onlineSockets.get(userId);
      if (!socketsForUser) return;

      socketsForUser.delete(socket.id);
      if (socketsForUser.size === 0) {
        onlineSockets.delete(userId);
        const lastSeenAt = new Date();
        const offlineTimer = setTimeout(async () => {
          pendingOfflineTimers.delete(userId);
          if (onlineSockets.has(userId)) return;

          try {
            await prisma.user.update({
              where: { id: userId },
              data: { lastSeenAt },
            });
          } catch (error) {
            console.error("Save user last-seen timestamp error:", error);
          }

          if (onlineSockets.has(userId)) return;
          io.emit("presence:update", {
            userId,
            status: "offline",
            lastSeenAt: lastSeenAt.toISOString(),
          });
        }, PRESENCE_DISCONNECT_GRACE_MS);
        pendingOfflineTimers.set(userId, offlineTimer);
      }
    });
  });

  app.set("io", io);
  return io;
};

module.exports = initializeChatSocket;
