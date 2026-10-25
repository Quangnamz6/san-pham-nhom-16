import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dashboardService } from "../services/dashboardService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Users,
  DollarSign,
  CalendarCheck2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Clock,
  UserCheck,
  ChevronRight,
} from "lucide-react";

export const DashboardPage = () => {
  const { user, role } = useAuth();
  const { toastError } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // If role is member or PT, redirect or adjust view
  useEffect(() => {
    if (role === "pt" || role === "member") {
      navigate("/schedules");
      return;
    }
    loadStats();
  }, [role]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch (err) {
      toastError("Không thể tải dữ liệu thống kê tổng quan.");
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gym-accent">
              Bảng Quản Trị Hệ Thống
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Chào mừng, {user?.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Dữ liệu tổng quan phòng tập, hợp đồng hội viên và doanh thu thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-gym-accent" : ""}`} />
            Làm mới
          </button>
          <Link
            to="/members"
            className="px-4 py-2.5 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Quản lý Hội viên
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards - Interactive & Hover Enhanced */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-36">
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Tổng hội viên - Chuyển sang /members */}
          <div
            onClick={() => navigate("/members")}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-400 cursor-pointer transition-all duration-200 group relative overflow-hidden"
            title="Nhấp để xem danh sách hội viên"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors">
                Tổng Hội Viên
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 group-hover:text-gym-accent transition-colors">
              {stats?.total_members || 0}
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{stats?.new_members_this_month || 0} mới tháng này</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-gym-accent group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* 2. Doanh thu tháng - Chuyển sang /payments */}
          <div
            onClick={() => navigate("/payments")}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-400 cursor-pointer transition-all duration-200 group relative overflow-hidden"
            title="Nhấp để xem chi tiết doanh thu & hóa đơn"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors">
                Doanh Thu Tháng Này
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-3 truncate group-hover:text-emerald-700 transition-colors">
              {formatVND(stats?.revenue_this_month)}
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="text-xs text-slate-500 font-medium">
                Tích lũy: {formatVND(stats?.total_revenue)}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* 3. Thẻ sắp hết hạn - Chuyển sang /members */}
          <div
            onClick={() => navigate("/members")}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-amber-400 cursor-pointer transition-all duration-200 group relative overflow-hidden"
            title="Nhấp để xem hội viên sắp hết hạn & gia hạn ngay"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors">
                Sắp Hết Hạn (7 Ngày)
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-3 group-hover:text-amber-700 transition-colors">
              {stats?.expiring_soon_count || 0}
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="text-xs text-slate-500 font-medium">
                Cần tư vấn gia hạn kịp thời
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* 4. Check-in hôm nay - Chuyển sang /schedules */}
          <div
            onClick={() => navigate("/schedules")}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-400 cursor-pointer transition-all duration-200 group relative overflow-hidden"
            title="Nhấp để xem Lịch tập & Quầy Điểm danh"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors">
                Điểm Danh Hôm Nay
              </span>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-gym-accent group-hover:text-white transition-all shadow-sm">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 group-hover:text-gym-accent transition-colors">
              {stats?.today_checkins || 0} lượt
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="text-xs text-slate-500 font-medium">
                {stats?.today_schedules || 0} buổi tập PT hôm nay
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-gym-accent group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      )}

      {/* Analytics Chart & Expiring Members Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Simple Bar Chart: Weekly Attendance Peak */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Mật độ Hội viên trong tuần
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Biểu đồ ước tính lượng khách theo ngày</p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
              Cao điểm: T2, T4, T6
            </span>
          </div>

          {/* CSS Bar Chart */}
          <div className="h-52 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {[
              { day: "T2", h: "85%", count: "120" },
              { day: "T3", h: "60%", count: "85" },
              { day: "T4", h: "95%", count: "140", active: true },
              { day: "T5", h: "55%", count: "78" },
              { day: "T6", h: "90%", count: "130" },
              { day: "T7", h: "75%", count: "105" },
              { day: "CN", h: "40%", count: "55" },
            ].map((col, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                  {col.count}
                </span>
                <div
                  style={{ height: col.h }}
                  className={`w-full rounded-t-lg transition-all ${
                    col.active
                      ? "bg-gradient-to-t from-gym-accent to-amber-500 shadow-md shadow-orange-500/20"
                      : "bg-slate-200 group-hover:bg-slate-300"
                  }`}
                ></div>
                <span className="text-xs font-bold text-slate-500">{col.day}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gym-accent"></span> Ngày đông khách nhất
            </span>
            <span>Khung giờ vàng: 17:30 - 20:30</span>
          </div>
        </div>

        {/* Expiring Soon Members Table */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Hội viên sắp hết hạn gói tập (Trong 7 ngày)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Danh sách cần liên hệ tư vấn gia hạn kịp thời</p>
            </div>
            <Link
              to="/members"
              className="text-xs font-bold text-gym-accent hover:text-orange-600 transition-colors flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : !stats?.expiring_members || stats.expiring_members.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
              <UserCheck className="w-8 h-8 text-emerald-500 mb-2 stroke-[1.5]" />
              <p className="font-medium">Hiện không có hội viên nào hết hạn trong 7 ngày tới.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 pb-2 uppercase font-bold">
                    <th className="pb-2.5 font-bold">Hội viên</th>
                    <th className="pb-2.5 font-bold">Gói tập</th>
                    <th className="pb-2.5 font-bold">Ngày hết hạn</th>
                    <th className="pb-2.5 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.expiring_members.map((mem) => (
                    <tr key={mem.user_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-900">{mem.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{mem.phone || mem.email}</div>
                      </td>
                      <td className="py-3 text-slate-700 font-semibold">
                        {mem.package_name}
                      </td>
                      <td className="py-3">
                        <span className="text-amber-600 font-bold">
                          {mem.end_date}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          (Còn {mem.days_left} ngày)
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/members?search=${encodeURIComponent(mem.full_name)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold text-[11px] border border-orange-200 transition-all"
                        >
                          Gia hạn ngay
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
