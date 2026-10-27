import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Dumbbell,
  Clock,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export const Sidebar = () => {
  const { user, role } = useAuth();
  const location = useLocation();

  // Collapsible state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("gym_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("gym_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Navigation Items with RBAC roles (Minimalist, Clean & Compact)
  const allNavItems = [
    {
      title: "Tổng quan",
      path: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "receptionist"],
    },
    {
      title: "Quản lý Hội viên",
      path: "/members",
      icon: Users,
      roles: ["admin", "receptionist"],
    },
    {
      title: "Doanh thu & Hóa đơn",
      path: "/payments",
      icon: CreditCard,
      roles: ["admin", "receptionist"],
    },
    {
      title: "Gói tập dịch vụ",
      path: "/member/packages",
      icon: Dumbbell,
      roles: ["admin", "receptionist", "member"],
    },
    {
      title: "Vé Tập Linh Hoạt",
      path: "/member/hourly-pass",
      icon: Clock,
      roles: ["admin", "receptionist", "member"],
    },
    {
      title: "Gói đã đăng ký",
      path: "/member/my-memberships",
      icon: CreditCard,
      roles: ["member"],
    },
    {
      title: role === "pt" ? "Lịch dạy & Điểm danh" : role === "member" ? "Lịch tập của tôi" : "Lịch tập & Điểm danh",
      path: "/schedules",
      icon: CalendarDays,
      roles: ["admin", "receptionist", "pt", "member"],
    },
    {
      title: "Trợ lý AI Thể hình",
      path: "/ai-assistant",
      icon: Sparkles,
      roles: ["admin", "receptionist", "pt", "member"],
      highlight: true,
      action: "open-chat",
    },
  ];

  // Filter based on user's role
  const allowedItems = allNavItems.filter((item) => {
    if (!role) return false;
    return item.roles.includes(role);
  });

  const handleItemClick = (e, item) => {
    if (item.action === "open-chat") {
      e.preventDefault();
      // Dispatch custom event to instantly activate Floating AI Chatbot Widget
      window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { open: true } }));
    }
  };

  return (
    <aside
      className={`shrink-0 hidden md:flex flex-col justify-between self-start sticky top-20 rounded-3xl bg-slate-900/75 backdrop-blur-2xl border border-slate-800/80 shadow-2xl transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[68px] p-2.5" : "w-56 lg:w-60 p-3"
      }`}
    >
      <div className="space-y-2.5">
        {/* Section Header with Toggle Collapse Button */}
        {isCollapsed ? (
          <div className="flex items-center justify-center py-1">
            <button
              type="button"
              onClick={toggleCollapse}
              title="Mở rộng Sidebar Menu"
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 border border-slate-700/60 transition-all cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="px-2 pt-1 pb-0.5 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Menu Quản Trị
            </span>
            <button
              type="button"
              onClick={toggleCollapse}
              title="Thu gọn Sidebar Menu"
              className="p-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 border border-slate-700/60 transition-all cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleItemClick(e, item)}
                title={item.title}
                className={`group relative flex items-center rounded-2xl font-bold transition-all duration-200 overflow-hidden ${
                  isCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2 text-[13px]"
                } ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 scale-[1.01]"
                    : item.highlight
                    ? "text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 hover:translate-x-0.5"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/50 hover:translate-x-0.5"
                }`}
              >
                {/* Active Indicator Line: Cyan Dạ Quang Phát Sáng */}
                {isActive && (
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-cyan-300 shadow-[0_0_12px_#22d3ee] ${
                      isCollapsed ? "w-1 h-5" : "w-1 h-4.5"
                    }`}
                  ></span>
                )}

                <div
                  className={`flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                    isCollapsed ? "w-8 h-8 rounded-xl" : "w-7 h-7 rounded-lg"
                  } ${
                    isActive
                      ? "bg-white/20 text-white backdrop-blur-xs"
                      : item.highlight
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                      : "bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-cyan-300 border border-slate-700/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {!isCollapsed && (
                  <>
                    <span className="truncate leading-tight flex-1">{item.title}</span>
                    {!isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Security Card */}
      {isCollapsed ? (
        <div className="mt-3 flex justify-center" title="Bảo mật Chuẩn SaaS (JWT & RBAC 4 cấp độ)">
          <div className="w-8 h-8 rounded-xl bg-slate-950/70 border border-slate-800 text-cyan-400 flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div className="mt-4 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1 shadow-inner">
          <div className="flex items-center gap-1.5 text-white font-black text-[11px]">
            <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span>Bảo mật Chuẩn SaaS</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
            Xác thực JWT & phân quyền 4 cấp độ.
          </p>
        </div>
      )}
    </aside>
  );
};
