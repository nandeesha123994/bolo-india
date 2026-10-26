const prisma = require("../config/prisma");

const messageSelection = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  image: true,
  readAt: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      profileImage: true,
    },
  },
};

const serializeChatMessage = (message) => ({
  ...message,
  image: message.image
    ? `/api/chats/conversations/${message.conversationId}/images/${message.id}`
    : null,
});

const getConversationForParticipant = async (conversationId, userId) => {
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return null;
  }

  return prisma.chatConversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ firstUserId: userId }, { secondUserId: userId }],
    },
    select: {
      id: true,
      firstUserId: true,
      secondUserId: true,
    },
  });
};

const createChatMessage = async ({ conversationId, senderId, content, image }) =>
  prisma.$transaction(async (transaction) => {
    const message = await transaction.chatMessage.create({
      data: {
        conversationId,
        senderId,
        content: content || null,
        image: image || null,
      },
      select: messageSelection,
    });

    await transaction.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    return serializeChatMessage(message);
  });

const markMessagesRead = async (conversationId, readerId) => {
  const unreadMessages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      senderId: { not: readerId },
      readAt: null,
    },
    select: { id: true },
  });

  if (unreadMessages.length === 0) {
    return { messageIds: [], readAt: null };
  }

  const readAt = new Date();
  const messageIds = unreadMessages.map((message) => message.id);

  await prisma.chatMessage.updateMany({
    where: {
      id: { in: messageIds },
      readAt: null,
    },
    data: { readAt },
  });

  return { messageIds, readAt };
};

module.exports = {
  createChatMessage,
  getConversationForParticipant,
  markMessagesRead,
  messageSelection,
  serializeChatMessage,
};
