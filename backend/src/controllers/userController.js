const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../services/emailService");
const {
  scheduleWelcomeEmailDelivery,
} = require("../services/welcomeEmailOutboxService");
const { createNotification } = require("../services/notificationService");
const crypto = require("crypto");
const { performance } = require("node:perf_hooks");

// ==================== REGISTER ====================

const registerUser = async (req, res) => {
  const registrationStartedAt = performance.now();

  const logRegistrationTiming = (stage, startedAt) => {
    console.info(
      `[Registration timing] ${stage}: ${(
        performance.now() - startedAt
      ).toFixed(1)}ms`,
    );
  };

  try {
    const validationStartedAt = performance.now();
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    logRegistrationTiming("validation", validationStartedAt);

    const passwordHashStartedAt = performance.now();
    const hashedPassword = await bcrypt.hash(password, 10);
    logRegistrationTiming("bcrypt_hash", passwordHashStartedAt);

    const databaseStartedAt = performance.now();

    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          password: hashedPassword,
        },
      });

      await transaction.welcomeEmailOutbox.create({
        data: {
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    logRegistrationTiming("database_create_and_email_queue", databaseStartedAt);

    try {
      scheduleWelcomeEmailDelivery();
    } catch (emailQueueError) {
      console.error(
        "Could not schedule welcome email delivery:",
        emailQueueError,
      );
    }

    logRegistrationTiming("total_before_response", registrationStartedAt);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("User registration error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This email is already registered. Please log in.",
      });
    }

    return res.status(500).json({
      message: "Server error while registering user",
    });
  }
};

// ==================== LOGIN ====================

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
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
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
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
    console.error("Login error:", error);

    return res.status(500).json({
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

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        profileImage: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
        followers: {
          where: { followerId: req.user.id },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isFollowing = user.followers.length > 0;
    const canViewFollowersPosts = req.user.id === userId || isFollowing;
    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
        ...(canViewFollowersPosts
          ? {}
          : { visibility: "PUBLIC" }),
      },
      select: {
        id: true,
        content: true,
        image: true,
        video: true,
        category: true,
        hashtags: true,
        location: true,
        visibility: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        bio: user.bio,
        profileImage: user.profileImage,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        isFollowing,
      },
      posts,
    });
  } catch (error) {
    console.error("Get public profile error:", error);

    return res.status(500).json({
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
      data: { profileImage },
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

    return res.status(200).json({
      message: "Profile photo updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile photo error:", error);

    return res.status(500).json({
      message: "Server error while updating profile photo",
    });
  }
};

// ==================== UPDATE PROFILE ====================

const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name.trim(),
        bio: typeof bio === "string" ? bio.trim() || null : null,
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

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== FOLLOW USER ====================

const followUser = async (req, res) => {
  try {
    const followingId = Number(req.params.id);
    const followerId = req.user.id;

    if (!Number.isInteger(followingId) || followingId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

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

    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true },
    });

    await createNotification({
      userId: followingId,
      type: "FOLLOW",
      message: `${follower?.name || "Someone"} started following you.`,
    });

    return res.status(201).json({
      message: "User followed successfully",
      follow,
    });
  } catch (error) {
    console.error("Follow user error:", error);

    return res.status(500).json({
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

    return res.status(200).json({
      message: "User unfollowed successfully",
    });
  } catch (error) {
    console.error("Unfollow user error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET FOLLOWERS ====================

const getFollowers = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const totalFollowers = await prisma.follow.count({
      where: { followingId: userId },
    });

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalFollowers / limit);

    return res.status(200).json({
      followers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: totalFollowers,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get followers error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET FOLLOWING ====================

const getFollowing = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const totalFollowing = await prisma.follow.count({
      where: { followerId: userId },
    });

    const followingRecords = await prisma.follow.findMany({
      where: { followerId: userId },
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const following = followingRecords.map((follow) => follow.following);

    const totalPages = Math.ceil(totalFollowing / limit);

    return res.status(200).json({
      following,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers: totalFollowing,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get following error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== PEOPLE TAB: GET ALL USERS ====================
// No pagination here. The People tab receives the complete user list.

const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const search = req.query.search?.trim() || "";

    const where = {
      id: { not: currentUserId },
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };

    const [users, roleCounts] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          bio: true,
          profileImage: true,
          followers: {
            where: { followerId: currentUserId },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      Promise.all(
        ["ADMIN", "CONTENT_MANAGER", "MODERATOR"].map(async (role) => [
          role,
          await prisma.user.count({
            where: { ...where, role },
          }),
        ]),
      ),
    ]);

    const usersWithFollowStatus = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      bio: user.bio,
      profileImage: user.profileImage,
      isFollowing: user.followers.length > 0,
    }));

    return res.status(200).json({
      users: usersWithFollowStatus,
      roleCounts: Object.fromEntries(roleCounts),
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      message: "Server error while fetching users",
    });
  }
};

// ==================== SUPER ADMIN / ADMIN: GET PAGINATED + SEARCHABLE USERS ====================

const getAdminUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Pagination
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50,
    );

    const skip = (page - 1) * limit;

    // Global search: name, email, user ID, and role
    const search = String(req.query.search || "").trim();

    const searchConditions = [];

    if (search) {
      searchConditions.push(
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      );

      // Search by numeric user ID
      if (/^\d+$/.test(search)) {
        const searchId = Number(search);

        if (Number.isSafeInteger(searchId) && searchId > 0) {
          searchConditions.push({ id: searchId });
        }
      }

      // Search by role
      const normalizedRole = search.toUpperCase().replace(/\s+/g, "_");

      const allowedRoles = [
        "USER",
        "ADMIN",
        "CONTENT_MANAGER",
        "MODERATOR",
        "SUPER_ADMIN",
      ];

      if (allowedRoles.includes(normalizedRole)) {
        searchConditions.push({ role: normalizedRole });
      }
    }

    // Exclude the currently logged-in Super Admin from the user list.
    const where = {
      id: { not: currentUserId },
      ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
    };

    // Get total matching users and role statistics.
    const [totalUsers, roleCountResults, users] = await Promise.all([
      prisma.user.count({ where }),

      Promise.all(
        ["ADMIN", "CONTENT_MANAGER", "MODERATOR"].map(async (role) => [
          role,
          await prisma.user.count({
            where: {
              id: { not: currentUserId },
              role,
            },
          }),
        ]),
      ),

      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          followers: {
            where: { followerId: currentUserId },
            select: { id: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    const usersWithFollowStatus = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      isFollowing: user.followers.length > 0,
    }));

    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      users: usersWithFollowStatus,

      // Platform-wide role counts, independent of the current search.
      roleCounts: Object.fromEntries(roleCountResults),

      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && page <= totalPages,
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);

    return res.status(500).json({
      message: "Server error while fetching admin users",
    });
  }
};
// ==================== UPDATE USER ROLE ====================

const updateUserRole = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    const allowedRoles = ["USER", "ADMIN", "CONTENT_MANAGER", "MODERATOR"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
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

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Super Admin role cannot be changed",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return res.status(200).json({
      message: `User role updated to ${role} successfully`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);

    return res.status(500).json({
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

    if (user.role === "SUPER_ADMIN") {
      return res.status(403).json({
        message: "Super Admin cannot be deactivated",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return res.status(200).json({
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
    console.error("Update user status error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== SUPER ADMIN REGISTER USER ====================

const createUserBySuperAdmin = async (req, res) => {
  try {
    const { name, email, role = "USER" } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    const allowedRoles = ["USER", "ADMIN", "CONTENT_MANAGER", "MODERATOR"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    const temporaryPassword = crypto.randomBytes(18).toString("hex");
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const createdUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    try {
      const escapeHtml = (value) =>
        value.replace(
          /[&<>"']/g,
          (character) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[character],
        );

      const safeName = escapeHtml(createdUser.name);
      const safeEmail = escapeHtml(createdUser.email);

      await sendEmail({
        to: createdUser.email,
        subject: "Your Bolo India Account Is Ready",
        text: [
          `Hello ${createdUser.name},`,
          "",
          "Your Bolo India account has been created.",
          `Login email: ${createdUser.email}`,
          `Temporary password: ${temporaryPassword}`,
          `Assigned role: ${createdUser.role}`,
          "Login here: http://localhost:5173/login",
          "Please change your temporary password after logging in.",
        ].join("\n"),
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #222;">
            <h2>Welcome to Bolo India 🇮🇳</h2>
            <p>Hello <strong>${safeName}</strong>,</p>
            <p>Your Bolo India account has been created.</p>
            <p><strong>Login email:</strong> ${safeEmail}</p>
            <p><strong>Temporary password:</strong> ${temporaryPassword}</p>
            <p><strong>Assigned role:</strong> ${createdUser.role}</p>
            <p><a href="http://localhost:5173/login">Log in to Bolo India</a></p>
            <p>Please change your temporary password after logging in.</p>
            <p>Regards,<br /><strong>Bolo India Team</strong></p>
          </div>
        `,
      });

      console.info(`Registration email sent to ${createdUser.email}`);

      return res.status(201).json({
        message:
          "User registered successfully. Login credentials sent by email.",
        user: createdUser,
        emailSent: true,
      });
    } catch (emailError) {
      console.error("Super Admin registration email failed:", emailError);

      return res.status(201).json({
        message:
          "Account created, but the credentials email could not be sent. Please arrange email delivery before the user attempts to log in.",
        user: createdUser,
        emailSent: false,
      });
    }
  } catch (error) {
    console.error("Super Admin registration error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    return res.status(500).json({
      message: "Server error while registering user.",
    });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  getPublicProfile,
  createUserBySuperAdmin,
  updateProfilePhoto,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getAllUsers,
  getAdminUsers,
  updateUserRole,
  updateUserStatus,
  updateProfile,
};
