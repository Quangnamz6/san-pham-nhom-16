import React, { useState, useEffect } from "react";
import { scheduleService } from "../services/scheduleService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  CalendarDays,
  CalendarCheck2,
  Clock,
  Plus,
  User,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Check,
  ShieldAlert,
  Sparkles,
  Bot,
  Zap,
  Edit3,
  RotateCcw,
  UserCheck,
  Filter,
  Mail,
  Phone,
  RefreshCw,
  UserX,
  Calendar,
  AlertCircle,
  Bell,
} from "lucide-react";

export const SchedulesPage = () => {
  const { user, role } = useAuth();
  const { toastSuccess, toastError, toastWarning, toastInfo } = useToast();

  // Đọc role từ AuthContext hoặc localStorage và chuẩn hóa viết thường
  const getStoredRole = () => {
    try {
      const stored = localStorage.getItem("gym_user_data");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.role;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const rawRole = user?.role || role || getStoredRole() || "";
  const userRole = String(rawRole?.value || rawRole || "").trim().toLowerCase();
  const isStaff = ["admin", "receptionist", "reception", "staff"].includes(userRole);
  const isPT = userRole === "pt";
  const isMember = userRole === "member";

  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [recentAttendances, setRecentAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  // Filter state for Admin / Receptionist
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterPT, setFilterPT] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Check-in state
  const [checkInInput, setCheckInInput] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [lastCheckInResult, setLastCheckInResult] = useState(null);

  // Booking Modal state (Create new schedule)
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState({
    member_id: "",
    pt_id: "",
    start_date: new Date().toISOString().split("T")[0],
    start_time: "15:00",
    end_time: "16:30",
    notes: "",
  });
  const [booking, setBooking] = useState(false);

  // Edit / Dispatch Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editForm, setEditForm] = useState({
    pt_id: "",
    start_date: "",
    start_time: "15:00",
    end_time: "16:30",
    status: "scheduled",
    notes: "",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Cancel Schedule Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingSchedule, setCancellingSchedule] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, [user]);

  // Hàm tải dữ liệu lịch tập an toàn với header Authorization và log chi tiết
  const fetchSchedules = async (overrideFilters = {}) => {
    setLoading(true);
    try {
      let schedData = [];

      if (isStaff) {
        // Admin & Lễ tân: Lấy toàn bộ lịch tập kèm bộ lọc
        const search = overrideFilters.search !== undefined ? overrideFilters.search : filterSearch;
        const date_filter = overrideFilters.date !== undefined ? overrideFilters.date : filterDate;
        const pt_id = overrideFilters.pt !== undefined ? overrideFilters.pt : filterPT;
        const status = overrideFilters.status !== undefined ? overrideFilters.status : filterStatus;

        try {
          schedData = await scheduleService.getAllSchedules({
            search,
            date_filter,
            pt_id,
            status,
          });
        } catch (staffErr) {
          console.error("Lỗi khi tải toàn bộ lịch tập (Admin/Staff):", staffErr);
          schedData = await scheduleService.getSchedules();
        }
      } else {
        // Hội viên / PT: Lấy danh sách lịch tập cá nhân
        const targetId = user?.id || overrideFilters.member_id;
        try {
          schedData = await scheduleService.getSchedules(targetId ? { member_id: targetId } : {});
        } catch (memberErr) {
          console.error("Lỗi khi tải lịch tập qua getSchedules:", memberErr);
          try {
            schedData = await scheduleService.getMySchedules();
          } catch (myErr) {
            console.error("Lỗi khi tải my-schedules:", myErr);
            schedData = [];
          }
        }
      }

      setSchedules(Array.isArray(schedData) ? schedData : []);

      // Tải danh sách HLV & Điểm danh độc lập an toàn (Promise.allSettled)
      // Không để lỗi từ lịch sử điểm danh làm sập danh sách lịch tập của khách hàng
      try {
        const [trainRes, attRes] = await Promise.allSettled([
          scheduleService.getTrainers(),
          scheduleService.getAttendance(),
        ]);

        if (trainRes.status === "fulfilled" && Array.isArray(trainRes.value)) {
          setTrainers(trainRes.value);
          if (trainRes.value.length > 0 && !bookForm.pt_id) {
            setBookForm((prev) => ({ ...prev, pt_id: trainRes.value[0].id }));
          }
        }

        if (attRes.status === "fulfilled" && Array.isArray(attRes.value)) {
          setRecentAttendances(attRes.value.slice(0, 10));
        }
      } catch (metaErr) {
        console.warn("Không thể tải danh sách HLV hoặc lịch sử điểm danh phụ trợ:", metaErr);
      }
    } catch (err) {
      console.error("Lỗi chi tiết khi tải dữ liệu lịch tập và điểm danh:", err);
      toastError("Lỗi khi tải dữ liệu lịch tập. Vui lòng kiểm tra lại kết nối.");
    } finally {
      setLoading(false);
    }
  };

  const loadData = fetchSchedules;

  // Áp dụng bộ lọc tìm kiếm
  const handleApplyFilter = (e) => {
    e?.preventDefault();
    fetchSchedules();
  };

  // Đặt lại bộ lọc
  const handleResetFilter = () => {
    setFilterSearch("");
    setFilterDate("");
    setFilterPT("");
    setFilterStatus("");
    fetchSchedules({ search: "", date: "", pt: "", status: "" });
  };

  // Tạo lịch tập tự động với AI
  const handleGenerateAISchedule = async () => {
    setAiGenerating(true);
    try {
      toastInfo("🤖 AI đang phân tích thông tin gói tập và khởi tạo lịch tập 1-4 tuần...");
      const result = await scheduleService.generateAISchedule({
        member_id: isMember ? user?.id : undefined,
        weeks: 4,
      });

      if (result && result.length > 0) {
        toastSuccess(
          `🎉 AI đã thiết kế thành công ${result.length} buổi tập khoa học và lưu vào Database!`
        );
      } else {
        toastSuccess("✨ Đã tạo lịch tập thành công!");
      }
      // Tự động gọi lại cập nhật state ngay lập tức mà không cần F5
      await fetchSchedules();
    } catch (err) {
      console.error("Lỗi khi sinh lịch tập bằng AI:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Không thể sinh lịch tập bằng AI. Vui lòng kiểm tra gói tập hiện tại hoặc thử lại sau.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setAiGenerating(false);
    }
  };

  // Quầy Check-in nhanh qua số điện thoại hoặc ID
  const handleQuickCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInInput.trim()) return;

    setCheckInLoading(true);
    setLastCheckInResult(null);

    try {
      const isNum = /^\d+$/.test(checkInInput.trim());
      const payload = isNum && checkInInput.trim().length <= 5
        ? { member_id: Number(checkInInput.trim()) }
        : { phone: checkInInput.trim() };

      const res = await scheduleService.checkIn(payload);
      setLastCheckInResult(res);

      if (res.membership_warning) {
        toastWarning(res.membership_warning);
      } else {
        const memberName = res.member?.full_name || res.member_name || "";
        toastSuccess(`Hội viên ${memberName} điểm danh thành công!`);
      }

      setCheckInInput("");
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || "Điểm danh không thành công.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setCheckInLoading(false);
    }
  };

  // Điểm danh trực tiếp từ card lịch tập của hội viên
  const handleScheduleCheckIn = async (schedule) => {
    try {
      await scheduleService.checkInSchedule(schedule.id);
      toastSuccess(`✨ Điểm danh thành công cho hội viên ${schedule.member?.full_name || `#${schedule.member_id}`}!`);
      loadData();
    } catch (err) {
      // Fallback sang quickCheckIn
      try {
        const res = await scheduleService.quickCheckIn({
          member_id: schedule.member_id,
          schedule_id: schedule.id,
        });

        await scheduleService.updateSchedule(schedule.id, {
          status: "checked_in",
        });

        if (res?.membership_warning) {
          toastWarning(`Hội viên đã điểm danh! Cảnh báo gói tập: ${res.membership_warning}`);
        } else {
          toastSuccess(`✨ Điểm danh thành công cho hội viên ${schedule.member?.full_name || `#${schedule.member_id}`}!`);
        }
        loadData();
      } catch (innerErr) {
        const msg = innerErr.response?.data?.message || innerErr.response?.data?.detail || "Lỗi khi điểm danh hội viên.";
        toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
    }
  };

  // Kích hoạt quét và gửi nhắc nhở trước 2 giờ toàn hệ thống
  const handleTriggerReminders = async () => {
    setTriggeringReminders(true);
    try {
      const res = await scheduleService.triggerReminders();
      if (res.sent_count > 0) {
        toastSuccess(`⏰ Đã quét và gửi thành công ${res.sent_count} email nhắc lịch trước 2h cho hội viên!`);
      } else {
        toastInfo("ℹ️ Tiến trình đã quét: Không có lịch tập nào trong mốc 2 giờ tới cần gửi nhắc nhở.");
      }
      loadData();
    } catch (err) {
      toastError("Lỗi khi kích hoạt tiến trình quét và gửi email nhắc nhở.");
    } finally {
      setTriggeringReminders(false);
    }
  };

  // Gửi email nhắc nhở tức thì cho 1 buổi tập cụ thể
  const handleSendSingleReminder = async (schedule) => {
    try {
      toastInfo(`Đang gửi email nhắc nhở trước giờ tập tới ${schedule.member?.email || "hội viên"}...`);
      const res = await scheduleService.sendScheduleReminder(schedule.id);
      toastSuccess(res.message || "Đã gửi email nhắc nhở trước 2h thành công!");
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || "Không thể gửi email nhắc nhở.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  // Mở modal Sửa Lịch / Điều Phối
  const handleOpenEditModal = (schedule) => {
    setEditingSchedule(schedule);

    const startD = new Date(schedule.start_time);
    const endD = new Date(schedule.end_time);

    const yyyy = startD.getFullYear();
    const mm = String(startD.getMonth() + 1).padStart(2, "0");
    const dd = String(startD.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const startH = String(startD.getHours()).padStart(2, "0");
    const startM = String(startD.getMinutes()).padStart(2, "0");
    const endH = String(endD.getHours()).padStart(2, "0");
    const endM = String(endD.getMinutes()).padStart(2, "0");

    setEditForm({
      pt_id: schedule.pt_id,
      start_date: dateStr,
      start_time: `${startH}:${startM}`,
      end_time: `${endH}:${endM}`,
      status: schedule.status || "scheduled",
      notes: schedule.notes || "",
    });

    setIsEditModalOpen(true);
  };

  // Submit Modal Sửa Lịch / Điều Phối
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingSchedule) return;

    if (editForm.end_time <= editForm.start_time) {
      toastError("Giờ kết thúc phải sau giờ bắt đầu buổi tập!");
      return;
    }

    setEditSaving(true);
    try {
      const startIso = `${editForm.start_date}T${editForm.start_time}:00`;
      const endIso = `${editForm.start_date}T${editForm.end_time}:00`;

      await scheduleService.updateSchedule(editingSchedule.id, {
        pt_id: Number(editForm.pt_id),
        start_time: startIso,
        end_time: endIso,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });

      toastSuccess(
        `🎉 Đã điều phối lịch tập #${editingSchedule.id} thành công! Email thông báo tự động đã được gửi tới hội viên.`
      );
      setIsEditModalOpen(false);
      setEditingSchedule(null);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || "Không thể cập nhật lịch tập.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setEditSaving(false);
    }
  };

  // Mở modal Hủy / Đổi Lịch
  const handleOpenCancelModal = (schedule) => {
    setCancellingSchedule(schedule);
    setCancelReason("");
    setIsCancelModalOpen(true);
  };

  // Xác nhận Hủy Lịch
  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancellingSchedule) return;

    setCancelling(true);
    try {
      const staffName = user?.full_name || (userRole === "admin" ? "Admin" : "Lễ tân");
      const finalNote = cancelReason.trim()
        ? `[ĐÃ HỦY] ${cancelReason.trim()} (Bởi ${staffName})`
        : `[ĐÃ HỦY] Lễ tân/Admin xác nhận hủy lịch (Bởi ${staffName})`;

      await scheduleService.updateSchedule(cancellingSchedule.id, {
        status: "cancelled",
        notes: finalNote,
      });

      toastSuccess(`Đã hủy lịch tập #${cancellingSchedule.id}. Email thông báo đã gửi cho hội viên.`);
      setIsCancelModalOpen(false);
      setCancellingSchedule(null);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || "Không thể hủy lịch tập.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setCancelling(false);
    }
  };

  // Đặt Lịch Tập Mới Submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBooking(true);
    try {
      const startIso = `${bookForm.start_date}T${bookForm.start_time}:00`;
      const endIso = `${bookForm.start_date}T${bookForm.end_time}:00`;

      await scheduleService.createSchedule({
        member_id: Number(bookForm.member_id || user.id),
        pt_id: Number(bookForm.pt_id),
        start_time: startIso,
        end_time: endIso,
        notes: bookForm.notes || undefined,
      });

      toastSuccess("Đặt lịch tập luyện với Huấn luyện viên thành công!");
      setIsBookModalOpen(false);
      setBookForm((prev) => ({ ...prev, notes: "" }));
      // Tự động cập nhật state danh sách lịch tập ngay lập tức mà không cần F5
      await fetchSchedules();
    } catch (err) {
      console.error("Lỗi khi đặt lịch tập thủ công:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Không thể đặt lịch. Vui lòng kiểm tra lại thời gian (chống trùng lịch).";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBooking(false);
    }
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const mo = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${hh}:${mm} - ${dd}/${mo}/${yyyy}`;
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30">
            <Clock className="w-3 h-3 text-sky-400" /> Đã lên lịch
          </span>
        );
      case "checked_in":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="w-3 h-3 text-emerald-400" /> Đã điểm danh
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            <CheckCircle2 className="w-3 h-3 text-indigo-400" /> Hoàn thành
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <X className="w-3 h-3 text-rose-400" /> Đã hủy
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Vắng mặt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-300 border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

  const isFilterActive = Boolean(filterSearch || filterDate || filterPT || filterStatus);

  return (
    <div className="space-y-7 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-7 rounded-3xl border border-slate-800/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
              Quản Trị Lịch Hẹn & Điểm Danh
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              SMART SCHEDULE 2.0
            </span>
            {isStaff && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/40">
                QUYỀN ĐIỀU PHỐI TỔNG
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-cyan-400" />
            <span>Lịch Tập Luyện & Check-in</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {isStaff
              ? "Xem, chỉnh sửa, điểm danh và điều phối lịch tập của tất cả hội viên toàn hệ thống."
              : "Theo dõi lịch hẹn với Huấn luyện viên cá nhân và giáo án tập luyện AI."}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {schedules.length === 0 && (
            <button
              onClick={handleGenerateAISchedule}
              disabled={aiGenerating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] text-white text-xs font-black shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-60 cursor-pointer"
              title="Tự động phân tích gói tập và sinh lịch tập 1-4 tuần"
            >
              {aiGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>AI đang tạo lịch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                  <span>Tạo lịch tập tự động với AI</span>
                </>
              )}
            </button>
          )}

          {isStaff && (
            <button
              onClick={handleTriggerReminders}
              disabled={triggeringReminders}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shadow-md shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
              title="Quét và gửi email nhắc nhở trước 2 giờ cho các buổi tập sắp tới"
            >
              {triggeringReminders ? (
                <div className="w-3.5 h-3.5 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Quét Nhắc Lịch 2H</span>
            </button>
          )}

          <button
            onClick={() => {
              setBookForm((prev) => ({
                ...prev,
                member_id: isMember ? user.id : "",
              }));
              setIsBookModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl gradient-btn-primary hover:opacity-95 text-white text-xs font-black shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Đặt lịch tập mới</span>
          </button>
        </div>
      </div>

      {/* 1. Bộ Lọc Tìm Kiếm (Dành riêng cho Admin & Lễ tân) */}
      {isStaff && (
        <div className="bg-slate-900/80 backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-cyan-500/20 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-400">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span>Bộ Lọc Tìm Kiếm & Điều Phối Lịch Tập</span>
            </div>
            {isFilterActive && (
              <button
                onClick={handleResetFilter}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>

          <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Tìm kiếm tên / mã / sđt */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Tên hội viên, Mã HV (#123)..."
                className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all font-medium"
              />
            </div>

            {/* Ngày tập */}
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-medium"
              />
            </div>

            {/* Huấn luyện viên (PT) */}
            <div>
              <select
                value={filterPT}
                onChange={(e) => setFilterPT(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-medium"
              >
                <option value="">Tất cả Huấn luyện viên (PT)</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user?.full_name} ({t.specialty || t.specialization || "Fitness"})
                  </option>
                ))}
              </select>
            </div>

            {/* Trạng thái buổi tập */}
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-medium"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="scheduled">Đã lên lịch</option>
                <option value="checked_in">Đã điểm danh</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
                <option value="no_show">Vắng mặt</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl gradient-btn-primary text-white text-xs font-black shadow-md shadow-cyan-500/20 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Check-in Bar */}
      {(isStaff || isPT) && (
        <div className="bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-400 mb-3">
            <CalendarCheck2 className="w-4 h-4 text-cyan-400" />
            <span>Quầy Điểm Danh Nhanh (Fast Check-in)</span>
          </div>

          <form onSubmit={handleQuickCheckIn} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={checkInInput}
                onChange={(e) => setCheckInInput(e.target.value)}
                placeholder="Nhập Số điện thoại hoặc Mã hội viên (ID) để điểm danh nhanh..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={checkInLoading || !checkInInput.trim()}
              className="px-6 py-2.5 rounded-2xl gradient-btn-primary hover:opacity-95 text-white text-xs font-black shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {checkInLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Xác Nhận Check-in</span>
            </button>
          </form>

          {lastCheckInResult && (
            <div
              className={`mt-3 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                lastCheckInResult.membership_warning
                  ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                  : "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              }`}
            >
              {lastCheckInResult.membership_warning ? (
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold">
                  Đã check-in: {lastCheckInResult.member?.full_name} (#{lastCheckInResult.member_id})
                </span>
                {lastCheckInResult.membership_warning && (
                  <p className="mt-0.5 font-semibold text-amber-300">
                    ⚠️ {lastCheckInResult.membership_warning}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Workout Schedules on Left / Recent Check-ins on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Workout Schedules List */}
        <div className="lg:col-span-8 bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-cyan-400" />
              Danh Sách Lịch Tập ({schedules.length})
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Tự động chống trùng lịch HLV
              </span>
              <button
                onClick={() => loadData()}
                title="Tải lại danh sách"
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-800/50 rounded-2xl animate-pulse border border-slate-800"></div>
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center rounded-2xl bg-slate-950/50 border border-dashed border-cyan-500/30">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 shadow-inner text-cyan-400">
                <Sparkles className="w-7 h-7 text-cyan-400 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {isFilterActive
                  ? "Không tìm thấy lịch tập nào phù hợp với bộ lọc"
                  : "Chưa có buổi tập nào được lên lịch"}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
                {isFilterActive
                  ? "Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bấm 'Đặt lại bộ lọc' để xem toàn bộ lịch tập."
                  : "Bạn chưa có lịch tập nào trong hệ thống. Hãy để AI đọc thông tin Gói tập của bạn để tự động thiết kế lộ trình 1-4 tuần ngay tức thì!"}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {isFilterActive ? (
                  <button
                    onClick={handleResetFilter}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-btn-primary text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Đặt lại bộ lọc</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleGenerateAISchedule}
                      disabled={aiGenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {aiGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>AI đang khởi tạo lịch...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-cyan-300" />
                          <span>Tạo lịch tập tự động với AI</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setBookForm((prev) => ({
                          ...prev,
                          member_id: isMember ? user.id : "",
                        }));
                        setIsBookModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-slate-400" />
                      Đặt lịch thủ công
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/90 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,200,255,0.12)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {s.member?.full_name || `Hội viên #${s.member_id}`}
                      </span>
                      {isStaff && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          #{s.member_id}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">cùng HLV</span>
                      <span className="font-semibold text-cyan-400 text-xs">
                        {s.trainer?.user?.full_name || s.pt?.user?.full_name || `PT #${s.pt_id}`}
                      </span>

                      {s.notes && s.notes.includes("AI") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> Giáo án AI
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-semibold text-slate-200">{formatDateTime(s.start_time)}</span>
                      </div>
                      {s.member?.phone && isStaff && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{s.member.phone}</span>
                        </div>
                      )}
                    </div>

                    {s.notes && (
                      <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                        <span className="font-semibold text-slate-300">Ghi chú: </span>
                        <span className="italic text-slate-300">{s.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges & Action Buttons */}
                  <div className="flex flex-row md:flex-col items-end md:items-end justify-between md:justify-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {renderStatusBadge(s.status)}
                      {s.is_reminder_sent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          <Mail className="w-2.5 h-2.5 text-cyan-400" /> Đã nhắc 2h
                        </span>
                      )}
                    </div>

                    {/* Thao tác dành cho Admin & Lễ tân */}
                    {isStaff && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 1. Nút Sửa Lịch (Edit Icon) */}
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 transition-all font-bold text-xs cursor-pointer shadow-sm"
                          title="Chỉnh sửa ngày giờ, đổi PT hoặc cập nhật trạng thái"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Sửa Lịch</span>
                        </button>

                        {/* 2. Nút Hủy / Đổi Lịch */}
                        <button
                          onClick={() => handleOpenCancelModal(s)}
                          disabled={s.status === "cancelled"}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 disabled:opacity-40 transition-all font-bold text-xs cursor-pointer shadow-sm"
                          title="Hủy hoặc ghi nhận lý do dời lịch"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                          <span>Hủy/Đổi</span>
                        </button>

                        {/* 3. Nút Gửi Email Nhắc Nhở 2H */}
                        <button
                          onClick={() => handleSendSingleReminder(s)}
                          disabled={s.status === "cancelled" || s.status === "completed"}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:border-sky-500/60 disabled:opacity-40 transition-all font-bold text-xs cursor-pointer shadow-sm"
                          title="Gửi email nhắc nhở trước giờ tập ngay lập tức cho hội viên này"
                        >
                          <Bell className="w-3.5 h-3.5 text-sky-400" />
                          <span>Nhắc 2H</span>
                        </button>

                        {/* 4. Nút Check-in / Điểm Danh */}
                        <button
                          onClick={() => handleScheduleCheckIn(s)}
                          disabled={s.status === "checked_in" || s.status === "completed"}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 disabled:opacity-40 transition-all font-bold text-xs cursor-pointer shadow-sm"
                          title="Điểm danh hội viên vào buổi tập này"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Check-in</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance Log on Right */}
        <div className="lg:col-span-4 bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
            Lượt Điểm Danh Gần Đây
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse border border-slate-800"></div>
              ))}
            </div>
          ) : recentAttendances.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
              <CalendarCheck2 className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
              <p className="font-medium">Chưa có lượt điểm danh nào hôm nay.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentAttendances.map((att) => (
                <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">
                      {att.member?.full_name || `Hội viên #${att.member_id}`}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {formatDateTime(att.check_in_time)}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    Vào phòng
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Modal "Chỉnh Sửa / Điều Phối Lịch Tập" (Dành cho Admin & Lễ tân) */}
      {isEditModalOpen && editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-2xl w-full max-w-lg p-6 sm:p-7 rounded-3xl border border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative text-white max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    BẢN ĐIỀU PHỐI TRUNG TÂM
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Lịch #{editingSchedule.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  Chỉnh Sửa & Điều Phối Lịch Tập
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Hội viên:{" "}
                  <strong className="text-white">
                    {editingSchedule.member?.full_name || `HV #${editingSchedule.member_id}`}
                  </strong>{" "}
                  (Mã: #{editingSchedule.member_id})
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSchedule(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Ngày tập */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ngày tập mới</span>
                </label>
                <input
                  type="date"
                  required
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              {/* Khung giờ tập mới */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Giờ bắt đầu</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editForm.start_time}
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Giờ kết thúc</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editForm.end_time}
                    onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Chọn lại Huấn luyện viên phụ trách (PT) */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Huấn luyện viên phụ trách (PT)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-semibold normal-case">
                    *Tự động kiểm tra chống trùng lịch
                  </span>
                </label>
                <select
                  value={editForm.pt_id}
                  onChange={(e) => setEditForm({ ...editForm, pt_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.full_name} ({t.specialty || t.specialization || "Fitness & PT"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Thay đổi trạng thái lịch tập */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trạng thái buổi tập</span>
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all font-semibold"
                >
                  <option value="scheduled">Đã lên lịch (Scheduled)</option>
                  <option value="checked_in">Đã điểm danh (Checked-in)</option>
                  <option value="completed">Hoàn thành (Completed)</option>
                  <option value="cancelled">Đã hủy (Cancelled)</option>
                  <option value="no_show">Vắng mặt (No-show)</option>
                </select>
              </div>

              {/* Ghi chú bổ sung từ Lễ tân / Admin */}
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ghi chú điều phối từ Lễ tân / Admin</span>
                </label>
                <textarea
                  rows="3"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="VD: Hội viên báo dời lịch do bận công tác; đã thỏa thuận đổi sang PT Nguyễn Văn A..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                ></textarea>
              </div>

              {/* Email Notification Banner */}
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-start gap-2.5 text-sky-300 text-[11px] leading-relaxed">
                <Mail className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Tự động thông báo qua Email:</span> Hệ thống sẽ gửi email xác nhận chi tiết về ngày, giờ, HLV và ghi chú điều phối tới hội viên ngay khi lưu.
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingSchedule(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2.5 rounded-xl gradient-btn-primary hover:opacity-95 text-white font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  {editSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang lưu & gửi email...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Xác Nhận & Điều Phối Lịch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Hủy / Đổi Lịch */}
      {isCancelModalOpen && cancellingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-2xl w-full max-w-md p-6 rounded-3xl border border-rose-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative text-white">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  Xác Nhận Hủy Lịch Tập
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Hội viên:{" "}
                  <strong className="text-white">
                    {cancellingSchedule.member?.full_name || `#${cancellingSchedule.member_id}`}
                  </strong>{" "}
                  - Buổi #{cancellingSchedule.id}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancellingSchedule(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Lý do hủy / đổi lịch
                </label>
                <textarea
                  rows="3"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy (VD: Hội viên bận đột xuất, xin dời sang tuần sau...)"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
                ></textarea>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  Trạng thái sẽ chuyển thành <strong>Đã hủy</strong> và email thông báo tự động sẽ được gửi cho Hội viên.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelModalOpen(false);
                    setCancellingSchedule(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={cancelling || !cancelReason.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold shadow-lg shadow-rose-500/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {cancelling ? "Đang xử lý..." : "Xác Nhận Hủy Lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Book Workout (Đặt Lịch Mới) */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-2xl w-full max-w-md p-6 rounded-3xl border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-cyan-400" />
                Đặt Lịch Huấn Luyện Viên (PT)
              </h3>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
              {!isMember && (
                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Mã Hội viên (Member ID)
                  </label>
                  <input
                    type="number"
                    required
                    value={bookForm.member_id}
                    onChange={(e) => setBookForm({ ...bookForm, member_id: e.target.value })}
                    placeholder="VD: 5"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Chọn Huấn luyện viên (PT)
                </label>
                <select
                  value={bookForm.pt_id}
                  onChange={(e) => setBookForm({ ...bookForm, pt_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.full_name} ({t.specialty || t.specialization || "Fitness"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Ngày tập
                </label>
                <input
                  type="date"
                  required
                  value={bookForm.start_date}
                  onChange={(e) => setBookForm({ ...bookForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    required
                    value={bookForm.start_time}
                    onChange={(e) => setBookForm({ ...bookForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Giờ kết thúc
                  </label>
                  <input
                    type="time"
                    required
                    value={bookForm.end_time}
                    onChange={(e) => setBookForm({ ...bookForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Ghi chú mục tiêu bài tập
                </label>
                <textarea
                  rows="2"
                  value={bookForm.notes}
                  onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                  placeholder="VD: Tập nhóm cơ ngực và bắp tay sau..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="px-4 py-2 rounded-xl gradient-btn-primary text-white font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  {booking ? "Đang kiểm tra..." : "Xác Nhận Đặt Lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
