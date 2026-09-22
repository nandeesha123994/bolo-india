const express = require("express");

const {
  createReport,
  getReports,
  updateReportStatus,
  getMyReports,
} = require("../controllers/reportController");

const authMiddleware = require("../middleware/authMiddleware");
const contentManagerMiddleware = require("../middleware/contentManagerMiddleware");

const router = express.Router();

// Any logged-in user can report a post
router.post("/", authMiddleware, createReport);

//get all reports for the logged-in user
router.get("/my-reports", authMiddleware, getMyReports);

// Content Manager/Admin/Super Admin can view reports
router.get("/", authMiddleware, contentManagerMiddleware, getReports);

// Content Manager/Admin/Super Admin can resolve/reject reports
router.put(
  "/:id/status",
  authMiddleware,
  contentManagerMiddleware,
  updateReportStatus,
);

module.exports = router;
