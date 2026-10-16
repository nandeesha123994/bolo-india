const prisma = require("../config/prisma");

// User sends a support message
const createSupportMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Support message is required",
      });
    }

    const supportMessage = await prisma.supportMessage.create({
      data: {
        message: message.trim(),
        userId: req.user.id,
      },
    });

    res.status(201).json({
      message: "Support message sent successfully",
      supportMessage,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// User gets their own support messages
const getMySupportMessages = async (req, res) => {
  try {
    const messages = await prisma.supportMessage.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      messages,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Moderator gets all support messages
const getAllSupportMessages = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    const skip = (page - 1) * limit;

    const totalMessages = await prisma.supportMessage.count();

    const messages = await prisma.supportMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        limit,
        hasNextPage: page < Math.ceil(totalMessages / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Moderator replies to a support message
const replyToSupportMessage = async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        message: "Reply is required",
      });
    }

    const supportMessage = await prisma.supportMessage.findUnique({
      where: {
        id: messageId,
      },
    });

    if (!supportMessage) {
      return res.status(404).json({
        message: "Support message not found",
      });
    }

    const updatedMessage = await prisma.supportMessage.update({
      where: {
        id: messageId,
      },
      data: {
        reply: reply.trim(),
        status: "RESOLVED",
      },
    });

    res.status(200).json({
      message: "Reply sent successfully",
      supportMessage: updatedMessage,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createSupportMessage,
  getMySupportMessages,
  getAllSupportMessages,
  replyToSupportMessage,
};
