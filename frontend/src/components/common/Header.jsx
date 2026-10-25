import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Dumbbell, LogOut, User, Sparkles } from "lucide-react";

export const Header = () => {
  const { user, logout } = useAuth();
  const { toastInfo } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toastInfo("Đã đăng xuất khỏi hệ thống.");
    navigate("/login");
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200">Admin</span>;
      case "receptionist":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-200">Lễ tân</span>;
      case "pt":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-200">Huấn luyện viên</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">Hội viên</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gym-accent to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              GYM<span className="text-gym-accent">AI</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] tracking-wider text-slate-500 uppercase font-semibold">
              Management Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Right side: User Info & Actions */}
      <div className="flex items-center gap-3.5">
        <Link
          to="/ai-assistant"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold border border-orange-200 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Engine
        </Link>

        {user ? (
          <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shadow-inner">
                {user.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.full_name}
                </span>
                <div className="mt-0.5">{getRoleBadge(user.role)}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-all border border-slate-200 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
};
