const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");

const { createNotification } = require("../services/notificationService");

const uploadPostMedia = (file, resourceType) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "bolo-india/posts",
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url || !result.public_id) {
          return reject(new Error("Cloudinary returned incomplete upload data"));
        }

        return resolve(result);
      },
    );

    stream.end(file.buffer);
  });

// ==================== CREATE POST ====================

const createPost = async (req, res) => {
  let cloudinaryAsset = null;

  try {
    const {
      content,
      category,
      hashtags,
      location,
      visibility,
      commentsEnabled,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Post content is required",
      });
    }

    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];

    const allowComments =
      commentsEnabled === undefined
        ? true
        : commentsEnabled === "true" || commentsEnabled === true;

    // A post can have either an image or a video, not both
    if (imageFile && videoFile) {
      return res.status(400).json({
        message: "A post can contain either an image or a video, not both",
      });
    }

    const mediaFile = imageFile || videoFile;
    const resourceType = imageFile ? "image" : videoFile ? "video" : null;

    if (mediaFile) {
      cloudinaryAsset = await uploadPostMedia(mediaFile, resourceType);
    }

    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        image: imageFile ? cloudinaryAsset.secure_url : null,
        video: videoFile ? cloudinaryAsset.secure_url : null,
        mediaPublicId: cloudinaryAsset?.public_id || null,
        mediaResourceType: cloudinaryAsset?.resource_type || null,
        category: category || null,
        hashtags: hashtags || null,
        location: location || null,
        visibility: visibility || "PUBLIC",
        commentsEnabled: allowComments,
        authorId: req.user.id,
      },
    });

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error(error);

    if (cloudinaryAsset) {
      try {
        await cloudinary.uploader.destroy(cloudinaryAsset.public_id, {
          resource_type: cloudinaryAsset.resource_type,
        });
      } catch (cleanupError) {
        console.error("Failed to clean up Cloudinary post upload:", cleanupError);
      }
    }

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET ALL POSTS ====================

const getAllPosts = async (req, res) => {
  try {
    const hasPagination =
      req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    const skip = (page - 1) * limit;
    const totalPosts = hasPagination ? await prisma.post.count() : null;

    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      ...(hasPagination && { skip, take: limit }),
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        comments: true,
        likes: true,
      },
    });

    const postsWithAuthorProfile = posts.map((post) => ({
      ...post,
      author: post.author
        ? {
            ...post.author,
            profilePhoto: post.author.profileImage || null,
          }
        : null,
    }));

    res.status(200).json({
      posts: postsWithAuthorProfile,
      ...(hasPagination && {
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts,
          limit,
          hasNextPage: page < Math.ceil(totalPosts / limit),
          hasPreviousPage: page > 1,
        },
      }),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET ALL COMMENTS FOR ADMIN ====================

const getAllCommentsForAdmin = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    const skip = (page - 1) * limit;
    const totalComments = await prisma.comment.count();

    const comments = await prisma.comment.findMany({
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
            profileImage: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalComments / limit);

    res.status(200).json({
      comments,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        limit,
        hasNextPage: page < totalPages,
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

// ==================== DELETE POST ====================

const deletePost = async (req, res) => {
  try {
    const postId = Number(req.params.id);

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (
      post.authorId !== req.user.id &&
      req.user.role !== "ADMIN" &&
      req.user.role !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        message: "You can only delete your own post",
      });
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== UPDATE POST ====================

const updatePost = async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { content, image } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({
        message: "You can only update your own post",
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        image,
      },
    });

    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== LIKE POST ====================

const likePost = async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.user.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });

      return res.status(200).json({
        message: "Post unliked successfully",
        liked: false,
      });
    }

    const like = await prisma.like.create({
      data: {
        userId,
        postId,
      },
    });

    // Don't notify the user if they liked their own post
    if (post.authorId !== userId) {
      const liker = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
        },
      });

      await createNotification({
        userId: post.authorId,
        type: "LIKE",
        message: `${liker?.name || "Someone"} liked your post.`,
        postId: post.id,
      });
    }

    res.status(201).json({
      message: "Post liked successfully",
      liked: true,
      like,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== ADD COMMENT ====================

const addComment = async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    if (!post.commentsEnabled) {
      return res.status(403).json({
        message: "Comments are disabled for this post",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: req.user.id,
        postId,
      },
    });

    // Don't notify the user if they comment on their own post
    if (post.authorId !== req.user.id) {
      const commenter = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
        select: {
          name: true,
        },
      });

      await createNotification({
        userId: post.authorId,
        type: "COMMENT",
        message: `${commenter?.name || "Someone"} commented on your post.`,
        postId: post.id,
      });
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== GET COMMENTS ====================

const getComments = async (req, res) => {
  try {
    const postId = Number(req.params.id);

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(200).json({
      comments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== DELETE COMMENT ====================

const deleteComment = async (req, res) => {
  try {
    const commentId = Number(req.params.id);

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    // User can delete only their own comment.
    // Moderator, Admin and Super Admin can delete any comment.
    if (
      comment.userId !== req.user.id &&
      req.user.role !== "MODERATOR" &&
      req.user.role !== "ADMIN" &&
      req.user.role !== "SUPER_ADMIN"
    ) {
      return res.status(403).json({
        message: "You can only delete your own comment",
      });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== EXPORT ====================

module.exports = {
  createPost,
  getAllPosts,
  getAllCommentsForAdmin,
  deletePost,
  updatePost,
  likePost,
  addComment,
  getComments,
  deleteComment,
};
