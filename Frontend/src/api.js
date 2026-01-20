// src/api.js - ADD LOGOUT HEADER SUPPORT
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let currentToken = null;
let manualLogout = false; // ✅ Track manual logout state

export const setAuthToken = (token) => {
  if (token) {
    currentToken = token;
    localStorage.setItem("clerk_token", token);
    manualLogout = false; // ✅ Reset on new token
  } else {
    currentToken = null;
    localStorage.removeItem("clerk_token");
  }
};

// ✅ NEW: Set manual logout state
export const setManualLogout = (state) => {
  manualLogout = state;
};

export const getAuthToken = () => currentToken || localStorage.getItem("clerk_token");

api.interceptors.request.use((config) => {
  const token = currentToken || localStorage.getItem("clerk_token");
  
  // ✅ ADD MANUAL LOGOUT HEADER
  if (manualLogout) {
    config.headers['x-manual-logout'] = 'true';
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.log("🔐 Authentication error - clearing tokens");
      localStorage.removeItem("clerk_token");
      setAuthToken(null);
      
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default api;