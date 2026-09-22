import axios from "axios";

const API_URL = "http://localhost:5000/api/posts";

export const createPost = async (postData) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(API_URL, postData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getPosts = async () => {
  const response = await axios.get(API_URL);
  return response.data.posts;
};

export const likePost = async (postId) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${API_URL}/${postId}/like`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export const addComment = async (postId, content) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${API_URL}/${postId}/comment`,
    { content },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export const getComments = async (postId) => {
  const response = await axios.get(`${API_URL}/${postId}/comments`);

  return response.data;
};

export const createReport = async (postId, reason) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    "http://localhost:5000/api/reports",
    {
      postId,
      reason,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export const getMyReports = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    "http://localhost:5000/api/reports/my-reports",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data.reports;
};

export const deletePost = async (postId) => {
  const token = localStorage.getItem("token");

  const response = await axios.delete(`${API_URL}/${postId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};
