const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  /\/+$/,
  "",
);

export const API_ORIGIN = API_URL.replace(/\/api$/, "");

export default API_URL;


// common api url for frontend and backend communication.