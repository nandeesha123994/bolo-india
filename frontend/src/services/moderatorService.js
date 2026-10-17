import axios from "axios";
import API_BASE_URL from "../api";

const POSTS_API = `${API_BASE_URL}/posts`;

export const getModeratorPosts = async () => {
  const response = await axios.get(POSTS_API);

  return response.data.posts;
};

export const getPostComments = async (postId) => {
  const response = await axios.get(`${POSTS_API}/${postId}/comments`);

  return response.data.comments;
};

export const getModeratorComments = async (page = 1, limit = 5) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${POSTS_API}/admin/comments?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
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

export const getSupportMessages = async (page = 1, limit = 5) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_BASE_URL}/support?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export const replyToSupportMessage = async (messageId, reply) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_BASE_URL}/support/${messageId}/reply`,
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
