import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Helper to retrieve token from localStorage with fallbacks
export const getStoredAccessToken = () => {
  return (
    localStorage.getItem("gym_access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
};

// Request Interceptor: Attach JWT Token with exact Authorization header format
api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token) {
      const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors & Auto Token Refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Auto-refresh token if 401 or 403 occurs on protected calls (excluding login/auth endpoints)
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/verify-otp") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      const existingToken = getStoredAccessToken();
      if (!existingToken) {
        if (error.response.status === 401) {
          localStorage.removeItem("gym_access_token");
          localStorage.removeItem("gym_user_data");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const cleanToken = existingToken.startsWith("Bearer ")
          ? existingToken.slice(7).trim()
          : existingToken.trim();
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${cleanToken}` },
          }
        );

        const newToken = refreshRes.data?.access_token;
        if (newToken) {
          localStorage.setItem("gym_access_token", newToken);
          if (refreshRes.data.user) {
            localStorage.setItem("gym_user_data", JSON.stringify(refreshRes.data.user));
          }
          api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Only redirect to login on 401
        if (error.response.status === 401) {
          localStorage.removeItem("gym_access_token");
          localStorage.removeItem("gym_user_data");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem("gym_access_token");
      localStorage.removeItem("gym_user_data");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
