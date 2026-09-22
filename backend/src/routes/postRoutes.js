const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const express = require("express");

const {
  createPost,
  getAllPosts,
  deletePost,
  updatePost,
  likePost,
  addComment,
  getComments,
  deleteComment,
} = require("../controllers/postController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createPost,
);
router.get("/", getAllPosts);

router.delete("/admin/:id", authMiddleware, adminMiddleware, deletePost);

router.delete("/:id", authMiddleware, deletePost);

router.put("/:id", authMiddleware, updatePost);
router.post("/:id/like", authMiddleware, likePost);
router.post("/:id/comment", authMiddleware, addComment);
router.get("/:id/comments", getComments);

router.delete("/comment/:id", authMiddleware, deleteComment);

module.exports = router;
