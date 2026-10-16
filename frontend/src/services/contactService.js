import axios from "axios";

const API_URL = "http://localhost:5000/api/contact";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const getContactMessages = async (page = 1, limit = 5) => {
  const response = await axios.get(
    `${API_URL}?page=${page}&limit=${limit}`,
    getAuthConfig(),
  );

  return response.data;
};

export const replyToContactMessage = async (messageId, reply) => {
  const response = await axios.put(
    `${API_URL}/${messageId}/reply`,
    { reply },
    getAuthConfig(),
  );

  return response.data;
};
