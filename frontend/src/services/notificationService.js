import axios from "axios";
import API_BASE_URL from "../api";

const API_URL = `${API_BASE_URL}/notifications`;

// ==================== GET NOTIFICATIONS ====================

export const getNotifications = async (page = 1, limit = 5) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}?page=${page}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// ==================== MARK ONE AS READ ====================

export const markNotificationAsRead = async (notificationId) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_URL}/${notificationId}/read`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// ==================== MARK ALL AS READ ====================

export const markAllNotificationsAsRead = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_URL}/read-all`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
