const express = require("express");
const adminMiddleware = require("../middleware/adminMiddleware");
const superAdminMiddleware = require("../middleware/superAdminMiddleware");

const {
  registerUser,
  loginUser,
  getProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getAllUsers,
  makeAdmin ,
  removeAdmin
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/profile", authMiddleware, getProfile);
router.post("/:id/follow", authMiddleware, followUser);
router.delete("/:id/follow", authMiddleware, unfollowUser);
router.get("/:id/followers", getFollowers);
router.get("/:id/following", getFollowing);

router.get("/admin/users", authMiddleware, adminMiddleware, getAllUsers);

router.put(
  "/admin/make-admin/:id",
  authMiddleware,
  superAdminMiddleware,
  makeAdmin
);

router.put(
  "/admin/remove-admin/:id",
  authMiddleware,
  superAdminMiddleware,
  removeAdmin
);

module.exports = router;
