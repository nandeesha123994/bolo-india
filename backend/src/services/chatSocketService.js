const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const prisma = require("../config/prisma");
const {
  createChatMessage,
  getConversationForParticipant,
  markMessagesRead,
} = require("./chatService");
const { consumeChatRateLimit } = require("../middleware/chatRateLimit");

const MAX_MESSAGE_LENGTH = 5000;

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

    try {
      await socket.join(userRoom);
    } catch (error) {
      console.error("Socket user room join error:", error);
      socket.disconnect(true);
      return;
    }

    if (!socket.connected) return;

    const currentSockets = onlineSockets.get(userId) || new Set();
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

        await socket.join(`conversation:${conversationId}`);
        io.to(`conversation:${conversationId}`).emit("message:new", message);

        if (typeof acknowledge === "function") {
          acknowledge({ ok: true, message });
        }
      } catch (error) {
        console.error("Socket send message error:", error);
        acknowledgeError(acknowledge, "Unable to send message");
      }
    });

    const broadcastTyping = async (payload, isTyping, acknowledge) => {
      const conversationId = Number(payload?.conversationId);

      try {
        if (!(await ensureActiveAccount())) return;
        if (!isPositiveInteger(conversationId)) {
          return acknowledgeError(acknowledge, "Invalid conversation ID");
        }

        const action = isTyping ? "typing:start" : "typing:stop";
        const rateLimit = consumeChatRateLimit(userId, action);
        if (!rateLimit.allowed) {
          const message = `Too many typing events. Try again in ${rateLimit.retryAfterSeconds} seconds.`;
          if (typeof acknowledge === "function") {
            return acknowledgeError(acknowledge, message);
          }
          socket.emit("chat:error", { message });
          return;
        }

        const conversation = await getConversationForParticipant(
          conversationId,
          userId,
        );
        if (!conversation) {
          return acknowledgeError(acknowledge, "Conversation not found");
        }

        const room = `conversation:${conversationId}`;
        await socket.join(room);
        socket.to(room).emit("typing:update", {
          conversationId,
          userId,
          isTyping,
        });

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
          io.to(`conversation:${conversationId}`).emit("message:read", {
            conversationId,
            readerId: userId,
            messageIds: result.messageIds,
            readAt: result.readAt,
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
      const socketsForUser = onlineSockets.get(userId);
      if (!socketsForUser) return;

      socketsForUser.delete(socket.id);
      if (socketsForUser.size === 0) {
        onlineSockets.delete(userId);
        io.emit("presence:update", { userId, status: "offline" });
      }
    });
  });

  app.set("io", io);
  return io;
};

module.exports = initializeChatSocket;
