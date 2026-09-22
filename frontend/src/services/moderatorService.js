import axios from "axios";

const POSTS_API = "http://localhost:5000/api/posts";

export const getModeratorPosts = async () => {
  const response = await axios.get(POSTS_API);

  return response.data.posts;
};

export const getPostComments = async (postId) => {
  const response = await axios.get(`${POSTS_API}/${postId}/comments`);

  return response.data.comments;
};

export const deleteCommentByModerator = async (commentId) => {
  const token = localStorage.getItem("token");

  const response = await axios.delete(`${POSTS_API}/comment/${commentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const getSupportMessages = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get("http://localhost:5000/api/support", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.messages;
};

export const replyToSupportMessage = async (messageId, reply) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `http://localhost:5000/api/support/${messageId}/reply`,
    {
      reply,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
