const prisma = require("../config/prisma");

const messageSelection = {
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  image: true,
  deliveredAt: true,
  readAt: true,
  editedAt: true,
  deletedAt: true,
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
  return prisma.$transaction(async (transaction) => {
    const readAt = new Date();
    const readMessages = await transaction.chatMessage.updateManyAndReturn({
      where: {
        conversationId,
        senderId: { not: readerId },
        readAt: null,
        deletedAt: null,
        hiddenFor: { none: { userId: readerId } },
      },
      data: { readAt },
      select: { id: true },
    });

    if (readMessages.length === 0) {
      return {
        messageIds: [],
        readAt: null,
        deliveredAt: null,
        messages: [],
      };
    }

    const messageIds = readMessages.map((message) => message.id);
    await transaction.chatMessage.updateMany({
      where: {
        id: { in: messageIds },
        deliveredAt: null,
      },
      data: { deliveredAt: readAt },
    });

    const messages = await transaction.chatMessage.findMany({
      where: { id: { in: messageIds } },
      select: {
        id: true,
        senderId: true,
        deliveredAt: true,
        readAt: true,
      },
    });

    return { messageIds, readAt, deliveredAt: readAt, messages };
  });
};

const markMessagesDelivered = async (conversationId, recipientId, messageIds) => {
  if (!messageIds.length) return [];

  return prisma.chatMessage.updateManyAndReturn({
    where: {
      conversationId,
      id: { in: messageIds },
      senderId: { not: recipientId },
      deliveredAt: null,
      deletedAt: null,
      hiddenFor: { none: { userId: recipientId } },
    },
    data: { deliveredAt: new Date() },
    select: {
      id: true,
      senderId: true,
      deliveredAt: true,
      readAt: true,
    },
  });
};

const editChatMessage = async ({ conversationId, messageId, senderId, content }) => {
  const updatedMessages = await prisma.chatMessage.updateManyAndReturn({
    where: {
      id: messageId,
      conversationId,
      senderId,
      content: { not: null },
      image: null,
      deletedAt: null,
    },
    data: { content, editedAt: new Date() },
    select: messageSelection,
  });

  return updatedMessages[0] ? serializeChatMessage(updatedMessages[0]) : null;
};

const deleteChatMessageForUser = async ({ conversationId, messageId, userId }) =>
  prisma.$transaction(async (transaction) => {
    const message = await transaction.chatMessage.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    if (!message) return false;

    await transaction.chatMessageDeletion.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: {},
    });
    return true;
  });

const deleteChatMessageForEveryone = async ({
  conversationId,
  messageId,
  senderId,
}) =>
  prisma.$transaction(async (transaction) => {
    const existingMessage = await transaction.chatMessage.findFirst({
      where: { id: messageId, conversationId, senderId },
      select: messageSelection,
    });
    if (!existingMessage) return null;
    if (existingMessage.deletedAt) {
      return serializeChatMessage(existingMessage);
    }

    const deletedMessages = await transaction.chatMessage.updateManyAndReturn({
      where: {
        id: messageId,
        conversationId,
        senderId,
        deletedAt: null,
      },
      data: {
        content: null,
        image: null,
        deletedAt: new Date(),
      },
      select: messageSelection,
    });
    if (deletedMessages[0]) {
      return serializeChatMessage(deletedMessages[0]);
    }

    const concurrentlyDeletedMessage = await transaction.chatMessage.findFirst({
      where: { id: messageId, conversationId, senderId, deletedAt: { not: null } },
      select: messageSelection,
    });
    return concurrentlyDeletedMessage
      ? serializeChatMessage(concurrentlyDeletedMessage)
      : null;
  });

const broadcastChatMessage = (io, conversation, message) => {
  if (!io) return;

  for (const userId of [conversation.firstUserId, conversation.secondUserId]) {
    io.to(`user:${userId}`).emit("message:new", message);
  }
};

const broadcastConversationEvent = (io, conversation, event, payload) => {
  if (!io) return;

  for (const userId of [conversation.firstUserId, conversation.secondUserId]) {
    io.to(`user:${userId}`).emit(event, payload);
  }
};

module.exports = {
  broadcastChatMessage,
  broadcastConversationEvent,
  createChatMessage,
  deleteChatMessageForEveryone,
  deleteChatMessageForUser,
  editChatMessage,
  getConversationForParticipant,
  markMessagesDelivered,
  markMessagesRead,
  messageSelection,
  serializeChatMessage,
};
