import axios from "axios";

const rawBaseURL = (import.meta.env.VITE_API_URL || "/api").trim();
const cleanBaseURL = rawBaseURL.replace(/\/+$/, "");
const baseURL = cleanBaseURL.startsWith("http") && !cleanBaseURL.endsWith("/api")
  ? `${cleanBaseURL}/api`
  : cleanBaseURL || "/api";

const API = axios.create({
  baseURL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

export default API;
