import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { MembersPage } from "../pages/MembersPage";
import { PaymentsPage } from "../pages/PaymentsPage";
import { SchedulesPage } from "../pages/SchedulesPage";
import { AIAssistantPage } from "../pages/AIAssistantPage";
import { MemberPackages } from "../pages/MemberPackages";
import { MyMemberships } from "../pages/MyMemberships";
import { HourlyPass } from "../pages/HourlyPass";
import { MainLayout } from "../components/layout/MainLayout";
import { ProtectedRoute } from "../components/common/ProtectedRoute";

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes inside MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          {/* Dashboard (Admin & Receptionist) */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Members Management (Admin & Receptionist) */}
          <Route path="/members" element={<MembersPage />} />

          {/* Payments & Revenue Reports (Admin & Receptionist) */}
          <Route path="/payments" element={<PaymentsPage />} />

          {/* Member Packages (Service plans) */}
          <Route path="/member/packages" element={<MemberPackages />} />
          <Route path="/packages" element={<MemberPackages />} />

          {/* Hourly Pass (Vé tập theo giờ / Thuê PT theo giờ) */}
          <Route path="/member/hourly-pass" element={<HourlyPass />} />
          <Route path="/hourly-pass" element={<HourlyPass />} />

          {/* My Memberships (Hội viên: Gói đã đăng ký & Gia hạn) */}
          <Route path="/member/my-memberships" element={<MyMemberships />} />
          <Route path="/my-memberships" element={<MyMemberships />} />

          {/* Workout Schedules & Check-in (All roles) */}
          <Route path="/schedules" element={<SchedulesPage />} />

          {/* AI Assistant (All roles) */}
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/ai-advisor" element={<AIAssistantPage />} />

          {/* Default redirect for / */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
