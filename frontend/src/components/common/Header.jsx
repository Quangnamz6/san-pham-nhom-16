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
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]">Admin</span>;
      case "receptionist":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]">Lễ tân</span>;
      case "pt":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">HLV Cá Nhân</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">Hội viên VIP</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xl transition-all">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] transition-all duration-300">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xl tracking-wider text-white">
                GYM<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">AI</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,200,255,0.25)]">
                LUXURY
              </span>
            </div>
            <p className="hidden sm:block text-[9px] tracking-widest text-slate-400 font-semibold uppercase">
              Premium Fitness Portal
            </p>
          </div>
        </Link>
      </div>

      {/* Right side: User Info & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick AI Trigger */}
        <button
          type="button"
          onClick={handleOpenAi}
          className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-cyan-500/30 hover:border-cyan-400 shadow-xs hover:shadow-[0_0_15px_rgba(0,200,255,0.3)] transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Trợ Lý AI Thể Hình</span>
          <span className="sm:hidden">AI</span>
        </button>

        {user ? (
          <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                {user.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-100 leading-tight">
                  {user.full_name}
                </span>
                <div className="mt-0.5">{getRoleBadge(user.role)}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 rounded-xl bg-slate-800/70 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 text-slate-400 transition-all border border-slate-700/60 shadow-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-btn-primary text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
          >
            <User className="w-3.5 h-3.5" />
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
};
