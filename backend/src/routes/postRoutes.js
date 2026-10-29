const adminMiddleware = require("../middleware/adminMiddleware");
const moderatorMiddleware = require("../middleware/moderatorMiddleware");
const upload = require("../middleware/uploadMiddleware");
const express = require("express");

const {
  createPost,
  getAllPosts,
  getAllCommentsForAdmin,
  deletePost,
  updatePost,
  likePost,
  addComment,
  getComments,
  deleteComment,
} = require("../controllers/postController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const receivePostUploads = (req, res, next) => {
  upload.memory.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ])(req, res, (error) => {
    if (error) {
      return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        message: error.message || "Invalid file upload",
      });
    }

    return next();
  });
};

router.post(
  "/",
  authMiddleware,
  receivePostUploads,
  createPost,
);
router.get("/", getAllPosts);
router.get(
  "/admin/comments",
  authMiddleware,
  moderatorMiddleware,
  getAllCommentsForAdmin,
);

router.delete("/admin/:id", authMiddleware, adminMiddleware, deletePost);

router.delete("/:id", authMiddleware, deletePost);

router.put("/:id", authMiddleware, updatePost);
router.post("/:id/like", authMiddleware, likePost);
router.post("/:id/comment", authMiddleware, addComment);
router.get("/:id/comments", getComments);

router.delete("/comment/:id", authMiddleware, deleteComment);

module.exports = router;
