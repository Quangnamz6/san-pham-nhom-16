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

  const handleOpenAi = (e) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { open: true } }));
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200">Admin</span>;
      case "receptionist":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-200">Lễ tân</span>;
      case "pt":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">Huấn luyện viên</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">Hội viên</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">
              GYM<span className="text-blue-600">AI</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] tracking-wider text-slate-500 uppercase font-semibold">
              Ocean Edition
            </span>
          </div>
        </Link>
      </div>

      {/* Right side: User Info & Actions */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={handleOpenAi}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold border border-blue-200/80 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Chat AI Trợ Lý</span>
        </button>

        {user ? (
          <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-extrabold text-sm shadow-inner">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
};
