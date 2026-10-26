import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Dumbbell, Sparkles, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              GYM<span className="text-cyan-400">AI</span>
            </span>
            <span className="block text-[10px] tracking-wider text-slate-400 uppercase font-semibold">
              Ocean Fitness Platform
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Trang chủ
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { open: true } }))}
            className="flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Trợ lý AI
          </button>
          {user && (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Bảng điều khiển
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-white leading-tight">
                  {user.full_name}
                </span>
                <span className="text-xs uppercase tracking-wider font-bold text-cyan-400">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-300 transition-all border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/25 transition-all"
            >
              <UserIcon className="w-4 h-4" />
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
