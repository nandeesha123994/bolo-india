const express = require("express");

const adminMiddleware = require("../middleware/adminMiddleware");
const superAdminMiddleware = require("../middleware/superAdminMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  registerUser,
  loginUser,
  getProfile,
  updateProfilePhoto,
  createUserBySuperAdmin,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getAllUsers,
  getAdminUsers,
  updateUserRole,
  updateUserStatus,
  updateProfile,
} = require("../controllers/userController");

// ==================== FORGOT PASSWORD CONTROLLER ====================

const {
  forgotPassword,
  resetPassword,
} = require("../controllers/passwordController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ==================== AUTH ====================

router.post("/register", registerUser);

router.post("/login", loginUser);

// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password/:token", resetPassword);

// ONLY SUPER_ADMIN can register users through the dashboard
router.post(
  "/admin/register",
  authMiddleware,
  superAdminMiddleware,
  createUserBySuperAdmin,
);

// ==================== PROFILE ====================

router.get("/profile", authMiddleware, getProfile);

router.put("/profile", authMiddleware, updateProfile);

router.put("/profile/photo", authMiddleware, (req, res, next) => {
  upload.single("profileImage")(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Profile photo must be smaller than 5MB",
        });
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          message: "Please upload a valid profile photo file",
        });
      }

      return res.status(400).json({
        message: error.message || "Invalid file upload",
      });
    }

    return updateProfilePhoto(req, res, next);
  });
});

// ==================== FOLLOW SYSTEM ====================

router.post("/:id/follow", authMiddleware, followUser);

router.delete("/:id/follow", authMiddleware, unfollowUser);

router.get("/:id/followers", getFollowers);

router.get("/:id/following", getFollowing);

// ==================== USERS ====================

// People tab: show all users without pagination
router.get("/all", authMiddleware, getAllUsers);

// Admin Dashboard: show users with pagination
router.get("/admin/users", authMiddleware, adminMiddleware, getAdminUsers);

// ==================== ROLE MANAGEMENT ====================

// ONLY SUPER_ADMIN can change roles
router.put(
  "/admin/role/:id",
  authMiddleware,
  superAdminMiddleware,
  updateUserRole,
);

router.put(
  "/admin/status/:id",
  authMiddleware,
  adminMiddleware,
  updateUserStatus,
);

module.exports = router;
