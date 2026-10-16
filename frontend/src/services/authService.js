import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

export const loginUser = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, {
    email,
    password,
  });

  return response.data;
};

export const registerUser = async (name, email, password) => {
  const response = await axios.post(`${API_URL}/register`, {
    name,
    email: email.trim().toLowerCase(),
    password,
  }, {
    timeout: 15000,
  });

  if (
    response.status !== 201 ||
    typeof response.data?.message !== "string" ||
    !response.data.user
  ) {
    throw new Error("Registration failed");
  }

  return response.data;
};