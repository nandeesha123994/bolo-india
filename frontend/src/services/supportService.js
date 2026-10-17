import axios from "axios";
import API_BASE_URL from "../api";

const SUPPORT_API = `${API_BASE_URL}/support`;

// Send support message
export const sendSupportMessage = async (message) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    SUPPORT_API,
    {
      message,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// Get user's support messages
export const getMySupportMessages = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${SUPPORT_API}/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data.messages;
};
