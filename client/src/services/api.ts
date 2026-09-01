import axios from "axios";

const rawBaseURL = (import.meta.env.VITE_API_URL || "/api").trim();
const cleanBaseURL = rawBaseURL.replace(/\/+$/, "");
const baseURL = cleanBaseURL.startsWith("http") && !cleanBaseURL.endsWith("/api")
  ? `${cleanBaseURL}/api`
  : cleanBaseURL || "/api";

const API = axios.create({
  baseURL,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default API;
