const prisma = require("../config/prisma");

// USER reports a post
const createReport = async (req, res) => {
  try {
    const { postId, reason } = req.body;

    if (!postId || !reason) {
      return res.status(400).json({
        message: "Post ID and reason are required",
      });
    }

    const post = await prisma.post.findUnique({
      where: {
        id: Number(postId),
      },
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.authorId === req.user.id) {
      return res.status(400).json({
        message: "You cannot report your own post",
      });
    }

    const existingReport = await prisma.report.findUnique({
      where: {
        reporterId_postId: {
          reporterId: req.user.id,
          postId: Number(postId),
        },
      },
    });

    if (existingReport) {
      return res.status(400).json({
        message: "You have already reported this post",
      });
    }

    const report = await prisma.report.create({
      data: {
        reason,
        reporterId: req.user.id,
        postId: Number(postId),
      },
    });

    res.status(201).json({
      message: "Post reported successfully",
      report,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// CONTENT MANAGER views reports
const getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      reports,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// USER views their own reports

const getMyReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: {
        reporterId: req.user.id,
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      reports,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// CONTENT MANAGER resolves/rejects report

const updateReportStatus = async (req, res) => {
  try {
    const reportId = Number(req.params.id);
    const { status, response } = req.body;

    if (!["RESOLVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "Invalid report status",
      });
    }

    // Response is required when resolving/rejecting
    if (!response || !response.trim()) {
      return res.status(400).json({
        message: "Response is required when resolving or rejecting a report",
      });
    }

    const report = await prisma.report.findUnique({
      where: {
        id: reportId,
      },
    });

    if (!report) {
      return res.status(404).json({
        message: "Report not found",
      });
    }

    const updatedReport = await prisma.report.update({
      where: {
        id: reportId,
      },
      data: {
        status,
        response: response.trim(),
      },
    });

    res.status(200).json({
      message: "Report status updated successfully",
      report: updatedReport,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createReport,
  getReports,
  updateReportStatus,
  getMyReports,
};
