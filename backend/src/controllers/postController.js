const prisma = require("../config/prisma");

const createPost = async (req, res) => {
  try {
    const { content, image } = req.body;

    if (!content) {
      return res.status(400).json({
        message: "Post content is required",
      });
    }

    const post = await prisma.post.create({
      data: {
        content,
        image,
        authorId: req.user.id,
      },
    });

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },
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

    res.status(200).json({
      posts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

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

    if (post.authorId !== req.user.id) {
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
      return res.status(400).json({
        message: "Post already liked",
      });
    }

    const like = await prisma.like.create({
      data: {
        userId,
        postId,
      },
    });

    res.status(201).json({
      message: "Post liked successfully",
      like,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};
const addComment = async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { content } = req.body;

    if (!content) {
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

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.user.id,
        postId,
      },
    });

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

module.exports = { createPost, getAllPosts, deletePost, updatePost, likePost, addComment,getComments };
