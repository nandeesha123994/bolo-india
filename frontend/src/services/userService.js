import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

export const followUser = async (userId) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${API_URL}/${userId}/follow`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export const unfollowUser = async (userId) => {
  const token = localStorage.getItem("token");

  const response = await axios.delete(`${API_URL}/${userId}/follow`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const getProfile = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const uploadProfilePhoto = async (formData) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(`${API_URL}/profile/photo`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getFollowers = async (userId, page = 1, limit = 5) => {
  const response = await axios.get(
    `${API_URL}/${userId}/followers?page=${page}&limit=${limit}`,
  );

  return response.data;
};

export const getFollowing = async (userId, page = 1, limit = 5) => {
  const response = await axios.get(
    `${API_URL}/${userId}/following?page=${page}&limit=${limit}`,
  );

  return response.data;
};

export const updateProfile = async (data) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(`${API_URL}/profile`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};
