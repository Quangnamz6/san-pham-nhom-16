import api, { getStoredAccessToken } from "./api";

export const authService = {
  // Login with Email & Password
  login: async (email, password) => {
    const response = await api.post("/auth/login/json", { email, password });
    if (response.data.access_token) {
      localStorage.setItem("gym_access_token", response.data.access_token);
      if (response.data.user) {
        localStorage.setItem("gym_user_data", JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  // Register new member account (Triggers OTP email)
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  // Verify OTP 6-digit code
  verifyOtp: async (email, otp_code) => {
    const response = await api.post("/auth/verify-otp", { email, otp_code });
    if (response.data.access_token) {
      localStorage.setItem("gym_access_token", response.data.access_token);
      if (response.data.user) {
        localStorage.setItem("gym_user_data", JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  // Resend OTP code
  resendOtp: async (email) => {
    const response = await api.post("/auth/resend-otp", { email });
    return response.data;
  },

  // Get current authenticated user details
  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  // Refresh Token: Làm mới Access Token và cập nhật lại User Data / Role
  refreshToken: async () => {
    try {
      const response = await api.post("/auth/refresh");
      if (response.data?.access_token) {
        localStorage.setItem("gym_access_token", response.data.access_token);
        if (response.data.user) {
          localStorage.setItem("gym_user_data", JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (err) {
      console.warn("Lỗi làm mới token:", err);
      return null;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem("gym_access_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("gym_user_data");
  },
};
