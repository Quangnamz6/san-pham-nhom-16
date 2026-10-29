import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/authService";
import { getStoredAccessToken } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Normalize user role helper
  const normalizeUserData = (userData) => {
    if (!userData) return null;
    const normalizedRole = userData.role
      ? String(userData.role?.value || userData.role).trim().toLowerCase()
      : "";
    return {
      ...userData,
      role: normalizedRole,
    };
  };

  useEffect(() => {
    // Check if token exists in storage on initialization
    const storedUser = localStorage.getItem("gym_user_data");
    const token = getStoredAccessToken();

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(normalizeUserData(parsed));
      } catch (err) {
        authService.logout();
      }
    }

    // Auto synchronize fresh profile and role from backend
    if (token) {
      authService
        .getCurrentUser()
        .then((freshUser) => {
          if (freshUser) {
            const normalized = normalizeUserData(freshUser);
            setUser(normalized);
            localStorage.setItem("gym_user_data", JSON.stringify(normalized));
          }
        })
        .catch(() => {
          // Token expired or invalid
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const normalized = normalizeUserData(data.user);
    setUser(normalized);
    if (normalized) {
      localStorage.setItem("gym_user_data", JSON.stringify(normalized));
    }
    return data;
  };

  const register = async (userData) => {
    return await authService.register(userData);
  };

  const verifyOtp = async (email, otp_code) => {
    const data = await authService.verifyOtp(email, otp_code);
    if (data.user) {
      const normalized = normalizeUserData(data.user);
      setUser(normalized);
      localStorage.setItem("gym_user_data", JSON.stringify(normalized));
    }
    return data;
  };

  const resendOtp = async (email) => {
    return await authService.resendOtp(email);
  };

  const refreshToken = async () => {
    const data = await authService.refreshToken();
    if (data?.user) {
      const normalized = normalizeUserData(data.user);
      setUser(normalized);
      localStorage.setItem("gym_user_data", JSON.stringify(normalized));
    }
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const userRole = user?.role
    ? String(user.role?.value || user.role).trim().toLowerCase()
    : "";

  return (
    <AuthContext.Provider
      value={{
        user,
        role: userRole,
        login,
        register,
        verifyOtp,
        resendOtp,
        refreshToken,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
