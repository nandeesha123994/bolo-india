const prisma = require("../config/prisma");
const { sendEmail } = require("../services/emailService");

// ==================== CREATE CONTACT MESSAGE ====================

const createContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });

    res.status(201).json({
      message: "Your message has been submitted successfully",
      contactMessage,
    });
  } catch (error) {
    console.error("Create contact message error:", error);

    res.status(500).json({
      message: "Failed to submit contact message",
    });
  }
};

// ==================== GET ALL CONTACT MESSAGES ====================

const getContactMessages = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    const skip = (page - 1) * limit;

    const totalMessages = await prisma.contactMessage.count();

    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
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
    console.error("Get contact messages error:", error);

    res.status(500).json({
      message: "Failed to load contact messages",
    });
  }
};

// ==================== REPLY TO CONTACT MESSAGE ====================

const replyToContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        message: "Reply message is required",
      });
    }

    const contactMessage = await prisma.contactMessage.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!contactMessage) {
      return res.status(404).json({
        message: "Contact message not found",
      });
    }

    // Send email to visitor
    await sendEmail({
      to: contactMessage.email,
      subject: `Re: ${contactMessage.subject}`,
      text: `Hello ${contactMessage.name},

${reply}

Regards,
Bolo India Team`,
    });

    // Save reply in database
    const updatedMessage = await prisma.contactMessage.update({
      where: {
        id: Number(id),
      },
      data: {
        adminReply: reply,
        status: "REPLIED",
      },
    });

    res.status(200).json({
      message: "Reply sent successfully",
      contactMessage: updatedMessage,
    });
  } catch (error) {
    console.error("Reply contact message error:", error);

    res.status(500).json({
      message: "Failed to send reply",
    });
  }
};

module.exports = {
  createContactMessage,
  getContactMessages,
  replyToContactMessage,
};
