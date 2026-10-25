import React, { useState } from "react";
import { aiService } from "../services/aiService";
import {
  Sparkles,
  Dumbbell,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Copy,
  Check,
  Calendar,
  Award,
} from "lucide-react";

export const AIAdvisorPage = () => {
  const [activeTab, setActiveTab] = useState("workout"); // "workout", "reminder", "progress"
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Form 1: Workout recommendation
  const [workoutForm, setWorkoutForm] = useState({
    goal: "Tăng cơ ngực và xô, siết cơ bụng nét hơn",
    availability: "4 buổi/tuần, mỗi buổi 60 phút",
    fitness_level: "Trung bình (đã tập 6 tháng)",
    medical_notes: "Đau thắt lưng nhẹ, hạn chế cúi gập tạ quá nặng",
  });

  // Form 2: Reminder message
  const [reminderForm, setReminderForm] = useState({
    member_name: "Trần Thị Bích",
    package_name: "Gói Silver 3 Tháng",
    expire_date: "2026-10-28",
    missed_sessions: 3,
  });

  // Form 3: Progress summary
  const [progressForm, setProgressForm] = useState({
    member_name: "Nguyễn Văn An",
    total_days: 30,
    attendance_count: 14,
    pt_notes: "Buổi 1: Thể lực tốt, Deadlift 70kg đúng form. Buổi 2: Đẩy ngực cần chú ý cố định khớp vai hơn. Buổi 3: Tinh thần tập rất cao, hoàn thành đủ sets.",
  });

  const handleWorkoutSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await aiService.recommendWorkout(workoutForm);
      setResult({ type: "workout", data });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Không thể kết nối với AI Engine.");
    } finally {
      setLoading(false);
    }
  };

  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await aiService.generateReminder({
        ...reminderForm,
        missed_sessions: Number(reminderForm.missed_sessions),
      });
      setResult({ type: "reminder", data });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Không thể kết nối với AI Engine.");
    } finally {
      setLoading(false);
    }
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await aiService.summarizeProgress({
        ...progressForm,
        total_days: Number(progressForm.total_days),
        attendance_count: Number(progressForm.attendance_count),
      });
      setResult({ type: "progress", data });
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Không thể kết nối với AI Engine.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Gym AI Module Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Trợ Lý Thể Hình <span className="gradient-text">Tích Hợp AI</span>
        </h1>
        <p className="text-slate-500 text-sm mt-2 font-medium">
          Hệ thống AI xử lý gợi ý giáo án tập luyện an toàn y khoa, sinh tin nhắn chăm sóc khách hàng và phân tích tiến độ tập luyện 30 ngày.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => {
            setActiveTab("workout");
            setResult(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "workout"
              ? "bg-gym-accent text-white shadow-md shadow-orange-500/25"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          1. Gợi ý Lịch tập 1 Tuần
        </button>
        <button
          onClick={() => {
            setActiveTab("reminder");
            setResult(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "reminder"
              ? "bg-gym-accent text-white shadow-md shadow-orange-500/25"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          2. Tin nhắn Nhắc lịch / Gia hạn
        </button>
        <button
          onClick={() => {
            setActiveTab("progress");
            setResult(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "progress"
              ? "bg-gym-accent text-white shadow-md shadow-orange-500/25"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          3. Tóm tắt Tiến độ 30 Ngày
        </button>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-600 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Main Grid: Form on Left / Structured Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        {/* Form Container */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            {activeTab === "workout" && <Dumbbell className="w-5 h-5 text-gym-accent" />}
            {activeTab === "reminder" && <MessageSquare className="w-5 h-5 text-gym-accent" />}
            {activeTab === "progress" && <TrendingUp className="w-5 h-5 text-gym-accent" />}
            {activeTab === "workout" && "Nhập thông tin Lịch tập"}
            {activeTab === "reminder" && "Thông tin Hội viên & Gói tập"}
            {activeTab === "progress" && "Dữ liệu Điểm danh & Ghi chú PT"}
          </h2>

          {/* Form 1: Workout */}
          {activeTab === "workout" && (
            <form onSubmit={handleWorkoutSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mục tiêu (goal)</label>
                <input
                  type="text"
                  required
                  value={workoutForm.goal}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, goal: e.target.value })}
                  placeholder="Tăng cơ, giảm mỡ, săn chắc ngực vai..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thời gian rảnh (availability)</label>
                <input
                  type="text"
                  required
                  value={workoutForm.availability}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, availability: e.target.value })}
                  placeholder="3 buổi/tuần, 4 buổi/tuần, mỗi buổi 60p..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mức độ hiện tại (fitness_level)</label>
                <input
                  type="text"
                  required
                  value={workoutForm.fitness_level}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, fitness_level: e.target.value })}
                  placeholder="Mới bắt đầu, Trung bình (6 tháng), Nâng cao..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tiền sử chấn thương (medical_notes)</label>
                <textarea
                  rows="2"
                  value={workoutForm.medical_notes}
                  onChange={(e) => setWorkoutForm({ ...workoutForm, medical_notes: e.target.value })}
                  placeholder="Đau lưng, khớp gối, trật khớp vai cũ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gym-accent hover:bg-gym-accentHover text-white font-bold rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4" />}
                {loading ? "AI đang phân tích..." : "Gợi ý Lịch Tập 1 Tuần"}
              </button>
            </form>
          )}

          {/* Form 2: Reminder */}
          {activeTab === "reminder" && (
            <form onSubmit={handleReminderSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên hội viên</label>
                <input
                  type="text"
                  required
                  value={reminderForm.member_name}
                  onChange={(e) => setReminderForm({ ...reminderForm, member_name: e.target.value })}
                  placeholder="Trần Thị Bích"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên gói tập</label>
                <input
                  type="text"
                  required
                  value={reminderForm.package_name}
                  onChange={(e) => setReminderForm({ ...reminderForm, package_name: e.target.value })}
                  placeholder="Gói Silver 3 Tháng"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ngày hết hạn</label>
                  <input
                    type="date"
                    required
                    value={reminderForm.expire_date}
                    onChange={(e) => setReminderForm({ ...reminderForm, expire_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số buổi bỏ tập</label>
                  <input
                    type="number"
                    min="0"
                    value={reminderForm.missed_sessions}
                    onChange={(e) => setReminderForm({ ...reminderForm, missed_sessions: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gym-accent hover:bg-gym-accentHover text-white font-bold rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MessageSquare className="w-4 h-4" />}
                {loading ? "AI đang soạn tin..." : "Sinh Tin Nhắn Chăm Sóc"}
              </button>
            </form>
          )}

          {/* Form 3: Progress Summary */}
          {activeTab === "progress" && (
            <form onSubmit={handleProgressSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên hội viên</label>
                <input
                  type="text"
                  required
                  value={progressForm.member_name}
                  onChange={(e) => setProgressForm({ ...progressForm, member_name: e.target.value })}
                  placeholder="Nguyễn Văn An"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thời gian theo dõi</label>
                  <select
                    value={progressForm.total_days}
                    onChange={(e) => setProgressForm({ ...progressForm, total_days: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                  >
                    <option value="14">14 ngày qua</option>
                    <option value="30">30 ngày qua</option>
                    <option value="60">60 ngày qua</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số buổi điểm danh</label>
                  <input
                    type="number"
                    min="0"
                    max={progressForm.total_days}
                    value={progressForm.attendance_count}
                    onChange={(e) => setProgressForm({ ...progressForm, attendance_count: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ghi chú của PT sau các buổi tập</label>
                <textarea
                  rows="3"
                  value={progressForm.pt_notes}
                  onChange={(e) => setProgressForm({ ...progressForm, pt_notes: e.target.value })}
                  placeholder="Ghi chú đánh giá thể lực, mức tạ, lỗi kỹ thuật..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gym-accent hover:bg-gym-accentHover text-white font-bold rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <TrendingUp className="w-4 h-4" />}
                {loading ? "AI đang tổng hợp..." : "Tóm Tắt Báo Cáo Tiến Độ"}
              </button>
            </form>
          )}
        </div>

        {/* Results Container */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[420px]">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gym-accent" />
              Kết Quả Phản Hồi Từ AI Engine
            </span>
            {result && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Chuẩn hóa JSON
              </span>
            )}
          </h2>

          {!result && !loading && (
            <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400">
              <Sparkles className="w-12 h-12 stroke-[1.5] mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Sẵn sàng nhận lệnh.</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Chọn một trong 3 chức năng bên trái và nhấn nút thực thi để AI xử lý.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-72 flex flex-col items-center justify-center text-center text-slate-500">
              <div className="w-10 h-10 border-2 border-gym-accent border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-bold text-slate-800">Đang giao tiếp với AI API...</p>
              <p className="text-xs text-slate-400 mt-1">Hệ thống có cơ chế tự động thử lại (Retry) khi gặp Timeout hoặc Rate Limit</p>
            </div>
          )}

          {/* 1. Workout Result */}
          {result?.type === "workout" && (
            <div className="space-y-5">
              {/* Mandatory Medical Warning */}
              {result.data.requires_pt_consultation ? (
                <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs flex items-start gap-3 shadow-sm">
                  <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-sm uppercase tracking-wider text-rose-700 block">
                      🚨 CẢNH BÁO AN TOÀN Y TẾ: YÊU CẦU TƯ VẤN TRỰC TIẾP CÙNG PT
                    </span>
                    <p className="leading-relaxed font-semibold">{result.data.medical_warning}</p>
                    <div className="pt-1">
                      <a
                        href="/schedules"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md"
                      >
                        Đặt lịch khám tư vấn 1-1 cùng HLV ngay
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block mb-0.5 text-amber-800">Cảnh báo y tế bắt buộc:</span>
                    <span>{result.data.medical_warning}</span>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-slate-800 text-sm">
                <span className="font-bold text-gym-accent block mb-1">{result.data.plan_title}</span>
                <p className="text-xs text-slate-600 font-medium">{result.data.weekly_overview}</p>
              </div>

              {/* Weekly schedule */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Chi tiết các buổi tập trong tuần ({result.data.schedule?.length} buổi):
                </h3>
                {result.data.schedule?.map((day, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between mb-2 border-b border-slate-200/80 pb-1.5">
                      <span className="font-bold text-slate-900 text-sm">{day.day}</span>
                      <span className="text-xs text-gym-accent font-bold">{day.focus}</span>
                    </div>
                    {day.warmup && (
                      <p className="text-[11px] text-slate-500 mb-2 italic">Khởi động: {day.warmup}</p>
                    )}
                    <div className="space-y-1.5">
                      {day.exercises?.map((ex, exIdx) => (
                        <div key={exIdx} className="flex items-start justify-between text-xs bg-white border border-slate-200/60 p-2.5 rounded-lg shadow-2xs">
                          <div>
                            <span className="font-bold text-slate-800 block">{ex.name}</span>
                            {ex.notes && <span className="text-slate-500 text-[11px] font-medium">{ex.notes}</span>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <span className="font-bold text-orange-600">{ex.sets} sets × {ex.reps}</span>
                            <span className="block text-slate-400 text-[10px] font-medium">Nghỉ {ex.rest_seconds}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Reminder Result */}
          {result?.type === "reminder" && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Kênh gửi đề xuất: <span className="text-gym-accent font-bold">{result.data.recommended_channel}</span>
                  </span>
                  <button
                    onClick={() => handleCopyMessage(result.data.message)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-xs text-slate-700 font-bold border border-slate-200 shadow-2xs transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    {copied ? "Đã sao chép" : "Sao chép tin nhắn"}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap shadow-2xs font-medium">
                  {result.data.message}
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                  <span className="font-bold text-emerald-900">Call To Action gợi ý:</span> {result.data.call_to_action}
                </div>
              </div>
            </div>
          )}

          {/* 3. Progress Result */}
          {result?.type === "progress" && (
            <div className="space-y-4">
              {/* Attendance badge */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-600 font-semibold">Tỷ lệ chuyên cần trong kỳ:</span>
                <span className="text-sm font-extrabold text-gym-accent">{result.data.attendance_rate}</span>
              </div>

              {/* Highlights */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" /> Điểm tích cực đạt được:
                </h3>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside font-medium">
                  {result.data.positive_highlights?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Areas for improvement */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" /> Điểm cần cải thiện:
                </h3>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside font-medium">
                  {result.data.areas_for_improvement?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Next Actionable Advice */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Lời khuyên tiếp theo cho học viên:
                </h3>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside font-medium">
                  {result.data.next_actionable_advice?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Motivational Quote */}
              {result.data.motivational_quote && (
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-center italic text-xs text-orange-800 font-semibold">
                  "{result.data.motivational_quote}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
