import axios from "axios";

const rawBaseURL = (import.meta.env.VITE_API_URL || "/api").trim();
const cleanBaseURL = rawBaseURL.replace(/\/+$/, "");
const baseURL = cleanBaseURL.startsWith("http") && !cleanBaseURL.endsWith("/api")
  ? `${cleanBaseURL}/api`
  : cleanBaseURL || "/api";

const API = axios.create({
  baseURL,
});

// Automatically attach Authorization Bearer token from localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration / auth failures
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url || "";
      // If a protected route (/auth/me or /chat/) returns 401, remove invalid token from localStorage
      if (url.includes("/auth/me") || url.includes("/chat/")) {
        localStorage.removeItem("token");
      }
    }
    return Promise.reject(error);
  }
);

export default API;

