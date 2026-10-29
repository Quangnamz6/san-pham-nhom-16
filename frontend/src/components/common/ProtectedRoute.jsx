import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0e14]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gym-accent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const rawRole = user?.role ? String(user.role?.value || user.role).trim().toLowerCase() : "";
    const normalizedAllowed = allowedRoles.map((r) => String(r).trim().toLowerCase());
    const isAllowed =
      normalizedAllowed.includes(rawRole) ||
      (normalizedAllowed.includes("receptionist") && ["reception", "staff"].includes(rawRole));

    if (!isAllowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};
