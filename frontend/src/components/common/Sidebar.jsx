import React from "react";
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
} from "lucide-react";

export const Sidebar = () => {
  const { user, role } = useAuth();
  const location = useLocation();

  // Navigation Items with RBAC roles
  const allNavItems = [
    {
      title: "Tổng quan",
      path: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "receptionist"],
      description: "Thống kê doanh thu & KPI",
    },
    {
      title: "Quản lý Hội viên",
      path: "/members",
      icon: Users,
      roles: ["admin", "receptionist"],
      description: "Hồ sơ, tìm kiếm & gia hạn gói",
    },
    {
      title: "Doanh thu & Hóa đơn",
      path: "/payments",
      icon: CreditCard,
      roles: ["admin", "receptionist"],
      description: "Lịch sử thanh toán & doanh số",
    },
    {
      title: "Gói tập dịch vụ",
      path: "/member/packages",
      icon: Dumbbell,
      roles: ["admin", "receptionist", "member"],
      description: "Đăng ký & Chọn gói tập",
    },
    {
      title: "Vé Tập Linh Hoạt",
      subtitle: "Tự tập hoặc Thuê PT theo giờ",
      description: "Tự tập hoặc Thuê PT theo giờ",
      path: "/member/hourly-pass",
      icon: Clock,
      roles: ["admin", "receptionist", "member"],
    },
    {
      title: "Gói đã đăng ký",
      subtitle: "Thẻ tập & Gia hạn",
      description: "Thẻ tập & Gia hạn",
      path: "/member/my-memberships",
      icon: CreditCard,
      roles: ["member"],
    },
    {
      title: role === "pt" ? "Lịch dạy & Điểm danh" : role === "member" ? "Lịch tập của tôi" : "Lịch tập & Điểm danh",
      path: "/schedules",
      icon: CalendarDays,
      roles: ["admin", "receptionist", "pt", "member"],
      description: "Lịch PT & Check-in",
    },
    {
      title: "Trợ lý AI Thể hình",
      path: "/ai-assistant",
      icon: Sparkles,
      roles: ["admin", "receptionist", "pt", "member"],
      description: "Bật Chatbot Widget AI",
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
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white border-r border-slate-200 p-4 flex flex-col justify-between hidden md:flex shadow-sm">
      <div className="space-y-6">
        {/* Navigation list */}
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Quản Lý
          </span>
          <div className="mt-2.5 space-y-1">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleItemClick(e, item)}
                  className={`flex items-start gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all group ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold"
                      : item.highlight
                      ? "text-blue-600 bg-blue-50/80 hover:bg-blue-100/90 font-medium border border-blue-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      isActive ? "text-white" : item.highlight ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <div>
                    <div className="leading-tight flex items-center gap-1.5">
                      <span>{item.title}</span>
                      {item.highlight && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-blue-700">
                          AI
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isActive ? "text-blue-100" : "text-slate-400 group-hover:text-slate-500"
                      }`}
                    >
                      {item.subtitle || item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Security Card */}
      <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-slate-600 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Hệ thống Bảo mật JWT</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Phân quyền RBAC 4 cấp độ: Admin, Lễ tân, PT, Hội viên.
        </p>
      </div>
    </aside>
  );
};
