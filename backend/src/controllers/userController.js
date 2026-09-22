const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../services/emailService");
const { createNotification } = require("../services/notificationService");

// ==================== REGISTER ====================

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // ==================== SEND WELCOME EMAIL ====================

    try {
      await sendEmail({
        to: user.email,
        subject: "Welcome to Bolo India 🇮🇳",
        text: `Welcome to Bolo India, ${user.name}! Your account has been created successfully.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to Bolo India 🇮🇳</h2>

            <p>Hello <strong>${user.name}</strong>,</p>

            <p>
              Your Bolo India account has been created successfully.
            </p>

            <p>
              You can now log in and start sharing your thoughts,
              ideas and moments with India.
            </p>

            <p>
              Thank you for joining Bolo India!
            </p>

            <br />

            <p>
              Regards,<br />
              <strong>Bolo India Team</strong>
            </p>
          </div>
        `,
      });

      console.log(`Welcome email sent successfully to ${user.email}`);
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== LOGIN ====================

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been deactivated by the administrator",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== PROFILE ====================

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== UPDATE PROFILE PHOTO ====================

const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image to upload",
      });
    }

    const profileImage = `/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profileImage,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      message: "Profile photo updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error while updating profile photo",
    });
  }
};

// ==================== UPDATE PROFILE ====================

const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        name: name.trim(),
        bio: bio?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      message: "Server error while updating profile",
    });
  }
};

// ==================== FOLLOW USER ====================

const followUser = async (req, res) => {
  try {
    const followingId = Number(req.params.id);
    const followerId = req.user.id;

    if (followerId === followingId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      return res.status(400).json({
        message: "You are already following this user",
      });
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    // ==================== FOLLOW NOTIFICATION ====================

    const follower = await prisma.user.findUnique({
      where: {
        id: followerId,
      },
      select: {
        name: true,
      },
    });

    await createNotification({
      userId: followingId,
      type: "FOLLOW",
      message: `${follower?.name || "Someone"} started following you.`,
    });

    res.status(201).json({
      message: "User followed successfully",
      follow,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== UNFOLLOW USER ====================

const unfollowUser = async (req, res) => {
  try {
    const followingId = Number(req.params.id);
    const followerId = req.user.id;

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!existingFollow) {
      return res.status(400).json({
        message: "You are not following this user",
      });
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    res.status(200).json({
      message: "User unfollowed successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET FOLLOWERS ====================

const getFollowers = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const followers = await prisma.follow.findMany({
      where: {
        followingId: userId,
      },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(200).json({
      followers,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET FOLLOWING ====================

const getFollowing = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const followingRecords = await prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    const following = followingRecords.map((follow) => follow.following);

    res.status(200).json({
      following,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET ALL USERS ====================

const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,

        followers: {
          where: {
            followerId: currentUserId,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const usersWithFollowStatus = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,

      isFollowing: user.followers.length > 0,
    }));

    res.status(200).json({
      users: usersWithFollowStatus,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== UPDATE USER ROLE ====================

const updateUserRole = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    // Roles that SUPER_ADMIN can assign
    const allowedRoles = ["USER", "ADMIN", "CONTENT_MANAGER", "MODERATOR"];

    // Check whether requested role is valid
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Find target user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Protect SUPER_ADMIN
    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Super Admin role cannot be changed",
      });
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
      },
    });

    res.status(200).json({
      message: `User role updated to ${role} successfully`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== ACTIVATE / DEACTIVATE USER ====================

const updateUserStatus = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Super Admin cannot be deactivated
    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Super Admin cannot be deactivated",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
      },
    });

    res.status(200).json({
      message: isActive
        ? "User activated successfully"
        : "User deactivated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfilePhoto,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateProfile,
};
