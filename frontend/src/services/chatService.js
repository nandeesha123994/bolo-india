import axios from "axios";
import { io } from "socket.io-client";
import API_BASE_URL, { API_ORIGIN } from "../api";

const API_URL = `${API_BASE_URL}/chats`;
const CHAT_REQUEST_TIMEOUT_MS = 30_000;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("You must be logged in to use chat.");
  }

  return { Authorization: `Bearer ${token}` };
};

export const getConversations = async () => {
  const response = await axios.get(`${API_URL}/conversations`, {
    headers: getAuthHeaders(),
  });

  return response.data.conversations;
};

export const getOrCreateConversation = async (userId) => {
  const response = await axios.post(
    `${API_URL}/conversations`,
    { userId },
    { headers: getAuthHeaders() },
  );

  return response.data.conversation;
};

export const getConversationMessages = async (
  conversationId,
  page = 1,
  limit = 50,
) => {
  const response = await axios.get(
    `${API_URL}/conversations/${conversationId}/messages`,
    {
      headers: getAuthHeaders(),
      params: { page, limit },
    },
  );

  return response.data;
};

export const uploadChatImage = async (conversationId, imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await axios.post(
    `${API_URL}/conversations/${conversationId}/images`,
    formData,
    {
      headers: getAuthHeaders(),
      timeout: CHAT_REQUEST_TIMEOUT_MS,
    },
  );

  return response.data.message;
};

export const editChatMessage = async (conversationId, messageId, content) => {
  const response = await axios.patch(
    `${API_URL}/conversations/${conversationId}/messages/${messageId}`,
    { content },
    { headers: getAuthHeaders() },
  );

  return response.data.message;
};

export const deleteChatMessageForMe = async (conversationId, messageId) => {
  const response = await axios.post(
    `${API_URL}/conversations/${conversationId}/messages/${messageId}/delete-for-me`,
    {},
    { headers: getAuthHeaders() },
  );

  return response.data;
};

export const deleteChatMessageForEveryone = async (
  conversationId,
  messageId,
) => {
  const response = await axios.post(
    `${API_URL}/conversations/${conversationId}/messages/${messageId}/delete-for-everyone`,
    {},
    { headers: getAuthHeaders() },
  );

  return response.data.message;
};

export const getChatImage = async (imagePath, signal) => {
  const response = await axios.get(`${API_ORIGIN}${imagePath}`, {
    headers: getAuthHeaders(),
    responseType: "blob",
    signal,
    timeout: CHAT_REQUEST_TIMEOUT_MS,
  });

  return response.data;
};

export const connectChatSocket = () => {
  const token = localStorage.getItem("token");

  return io(API_ORIGIN, {
    auth: token ? { token } : {},
  });
};
