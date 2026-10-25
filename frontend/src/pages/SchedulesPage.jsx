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
} from "lucide-react";

export const SchedulesPage = () => {
  const { user, role } = useAuth();
  const { toastSuccess, toastError, toastWarning, toastInfo } = useToast();

  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [recentAttendances, setRecentAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Check-in state
  const [checkInInput, setCheckInInput] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [lastCheckInResult, setLastCheckInResult] = useState(null);

  // Booking Modal state
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

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 3. Sửa lại API lấy danh sách Lịch tập: Đảm bảo query theo member_id của hội viên đang đăng nhập
      const schedParams = role === "member" && user?.id ? { member_id: user.id } : {};
      const [schedData, trainData, attData] = await Promise.all([
        scheduleService.getSchedules(schedParams),
        scheduleService.getTrainers(),
        scheduleService.getAttendance(),
      ]);
      setSchedules(schedData || []);
      setTrainers(trainData || []);
      setRecentAttendances((attData || []).slice(0, 10));

      // Defaults for booking form
      if (trainData && trainData.length > 0) {
        setBookForm((prev) => ({ ...prev, pt_id: trainData[0].id }));
      }
    } catch (err) {
      toastError("Lỗi khi tải dữ liệu lịch tập và điểm danh.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Tạo lịch tập tự động với AI
  const handleGenerateAISchedule = async () => {
    setAiGenerating(true);
    try {
      toastInfo("🤖 AI đang phân tích thông tin gói tập và khởi tạo lịch tập 1-4 tuần...");
      const result = await scheduleService.generateAISchedule({
        member_id: role === "member" ? user?.id : undefined,
        weeks: 4,
      });

      if (result && result.length > 0) {
        toastSuccess(
          `🎉 AI đã thiết kế thành công ${result.length} buổi tập khoa học và lưu vào Database!`
        );
      } else {
        toastSuccess("✨ Đã tạo lịch tập thành công!");
      }
      // Tải lại dữ liệu mới nhất
      await loadData();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Không thể sinh lịch tập bằng AI. Vui lòng kiểm tra gói tập hiện tại hoặc thử lại sau.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setAiGenerating(false);
    }
  };

  // Quick Check-in
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
        toastSuccess(`Hội viên ${res.member?.full_name || ""} điểm danh thành công!`);
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

  // Booking Submit
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
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || "Không thể đặt lịch. Vui lòng kiểm tra lại thời gian (chống trùng lịch).";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBooking(false);
    }
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-gym-accent" />
            Lịch Tập Luyện & Điểm Danh (Check-in)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Điều phối lịch hẹn với Huấn luyện viên cá nhân và tự động lên giáo án AI thông minh.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 2. Tích hợp nút Tạo lịch tập bằng AI ngay cạnh nút Đặt lịch tập mới khi danh sách rỗng */}
          {schedules.length === 0 && (
            <button
              onClick={handleGenerateAISchedule}
              disabled={aiGenerating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all self-start sm:self-auto disabled:opacity-60 active:scale-95"
              title="Tự động phân tích gói tập và sinh lịch tập 1-4 tuần"
            >
              {aiGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>AI đang tạo lịch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Tạo lịch tập tự động với AI</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setBookForm((prev) => ({
                ...prev,
                member_id: role === "member" ? user.id : "",
              }));
              setIsBookModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Đặt lịch tập mới
          </button>
        </div>
      </div>

      {/* Quick Check-in Bar (Especially useful for Receptionists & PTs) */}
      {(role === "admin" || role === "receptionist" || role === "pt") && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gym-accent mb-3">
            <CalendarCheck2 className="w-4 h-4" /> Quầy Điểm Danh Nhanh (Fast Check-in)
          </div>

          <form onSubmit={handleQuickCheckIn} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={checkInInput}
                onChange={(e) => setCheckInInput(e.target.value)}
                placeholder="Nhập Số điện thoại hoặc Mã hội viên (ID)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={checkInLoading || !checkInInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {checkInLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Check className="w-4 h-4" />}
              Xác Nhận Check-in
            </button>
          </form>

          {/* Last Check-in Status Banner */}
          {lastCheckInResult && (
            <div className={`mt-3 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
              lastCheckInResult.membership_warning
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}>
              {lastCheckInResult.membership_warning ? (
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold">
                  Đã check-in: {lastCheckInResult.member?.full_name} (#{lastCheckInResult.member_id})
                </span>
                {lastCheckInResult.membership_warning && (
                  <p className="mt-0.5 font-semibold text-amber-700">
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
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gym-accent" />
              Danh Sách Lịch Tập ({schedules.length})
            </h2>
            <span className="text-xs text-slate-400 font-medium">Tự động chống trùng lịch HLV</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : schedules.length === 0 ? (
            /* 2. Giao diện khi danh sách lịch tập rỗng: Nổi bật nút tạo bằng AI */
            <div className="py-10 px-6 flex flex-col items-center justify-center text-center rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40 border border-dashed border-indigo-200">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center mb-3 shadow-inner text-indigo-600">
                <Sparkles className="w-7 h-7 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Chưa có buổi tập nào được lên lịch
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-5 leading-relaxed">
                Bạn chưa có lịch tập nào trong hệ thống. Hãy để AI đọc thông tin Gói tập của bạn (mục tiêu tăng/giảm cân) để tự động thiết kế lộ trình 1-4 tuần ngay tức thì!
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleGenerateAISchedule}
                  disabled={aiGenerating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-60"
                >
                  {aiGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>AI đang khởi tạo lịch...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Tạo lịch tập tự động với AI</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setBookForm((prev) => ({
                      ...prev,
                      member_id: role === "member" ? user.id : "",
                    }));
                    setIsBookModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4 text-slate-400" />
                  Đặt lịch thủ công
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {s.member?.full_name || `Hội viên #${s.member_id}`}
                      </span>
                      <span className="text-xs text-slate-400">cùng HLV</span>
                      <span className="font-semibold text-gym-accent text-xs">
                        {s.trainer?.user?.full_name || s.pt?.user?.full_name || `PT #${s.pt_id}`}
                      </span>

                      {s.notes && s.notes.includes("AI") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500" /> Giáo án AI
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{formatDateTime(s.start_time)}</span>
                      </div>
                      {s.notes && (
                        <div className="text-slate-600 line-clamp-2">
                          <span className="font-semibold text-slate-700">Nội dung: </span>
                          <span className="italic">{s.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {s.status === "scheduled" ? "Đã lên lịch" : s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance Log on Right */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
            Lượt Điểm Danh Gần Đây
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : recentAttendances.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
              <CalendarCheck2 className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="font-medium">Chưa có lượt điểm danh nào hôm nay.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAttendances.map((att) => (
                <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      {att.member?.full_name || `Hội viên #${att.member_id}`}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {formatDateTime(att.check_in_time)}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Vào phòng
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Book Workout */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gym-accent" />
                Đặt Lịch Huấn Luyện Viên (PT)
              </h3>
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
              {role !== "member" && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mã Hội viên (Member ID)
                  </label>
                  <input
                    type="number"
                    required
                    value={bookForm.member_id}
                    onChange={(e) => setBookForm({ ...bookForm, member_id: e.target.value })}
                    placeholder="VD: 5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chọn Huấn luyện viên (PT)
                </label>
                <select
                  value={bookForm.pt_id}
                  onChange={(e) => setBookForm({ ...bookForm, pt_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.full_name} ({t.specialty || t.specialization || "Fitness"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ngày tập
                </label>
                <input
                  type="date"
                  required
                  value={bookForm.start_date}
                  onChange={(e) => setBookForm({ ...bookForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    required
                    value={bookForm.start_time}
                    onChange={(e) => setBookForm({ ...bookForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Giờ kết thúc
                  </label>
                  <input
                    type="time"
                    required
                    value={bookForm.end_time}
                    onChange={(e) => setBookForm({ ...bookForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ghi chú mục tiêu bài tập
                </label>
                <textarea
                  rows="2"
                  value={bookForm.notes}
                  onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                  placeholder="VD: Tập nhóm cơ ngực và bắp tay sau..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="px-4 py-2 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white font-bold shadow-md shadow-orange-500/20 transition-all"
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
