import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { membershipService } from "../services/membershipService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Target,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  X,
  Dumbbell,
  ChevronRight,
  Award,
} from "lucide-react";

export const MyMemberships = () => {
  const { user } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal renewal states
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [durationOption, setDurationOption] = useState("1_month");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [goalType, setGoalType] = useState("lose"); // "lose" | "gain" | "maintain"
  const [goalNotes, setGoalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Duration configuration with multipliers
  const durationOptions = [
    { id: "1_week", label: "1 Tuần", days: 7, multiplier: 7 / 30, badge: null },
    { id: "15_days", label: "15 Ngày", days: 15, multiplier: 15 / 30, badge: null },
    { id: "1_month", label: "1 Tháng", days: 30, multiplier: 1, badge: "Chuẩn" },
    { id: "3_months", label: "3 Tháng", days: 90, multiplier: 3 * 0.95, badge: "Tiết kiệm 5%" },
    { id: "6_months", label: "6 Tháng", days: 180, multiplier: 6 * 0.9, badge: "Tiết kiệm 10%" },
    { id: "12_months", label: "12 Tháng", days: 365, multiplier: 12 * 0.8, badge: "Ưu đãi 20%" },
  ];

  const currentDurationObj = useMemo(() => {
    return durationOptions.find((d) => d.id === durationOption) || durationOptions[2];
  }, [durationOption]);

  useEffect(() => {
    fetchMyMemberships();
  }, []);

  const fetchMyMemberships = async () => {
    setLoading(true);
    try {
      const data = await membershipService.getMyMemberships();
      setMemberships(data || []);
    } catch (err) {
      toastError("Không thể tải danh sách gói tập đã đăng ký.");
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "---";
    const d = new Date(dateString);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleCopy = (text, fieldName) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toastInfo(`Đã sao chép: ${text}`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Open modal for selected membership
  const openRenewModal = (membership) => {
    setSelectedMembership(membership);
    setDurationOption("1_month");

    // Prepopulate goal info if available
    if (membership.target_weight_kg) {
      setTargetWeightKg(String(membership.target_weight_kg));
    } else {
      setTargetWeightKg("");
    }

    if (membership.goal_notes) {
      setGoalNotes(membership.goal_notes);
      if (membership.goal_notes.toLowerCase().includes("tăng")) {
        setGoalType("gain");
      } else if (membership.goal_notes.toLowerCase().includes("giảm")) {
        setGoalType("lose");
      }
    } else {
      setGoalNotes("");
      setGoalType("lose");
    }
  };

  const closeRenewModal = () => {
    setSelectedMembership(null);
    setSubmitting(false);
  };

  // Calculated renewal price
  const calculatedPrice = useMemo(() => {
    if (!selectedMembership?.package) return 0;
    const basePrice = Number(selectedMembership.package.price) || 0;
    return Math.round((basePrice * currentDurationObj.multiplier) / 10000) * 10000;
  }, [selectedMembership, currentDurationObj]);

  // QR transfer content and data
  const qrTransferData = useMemo(() => {
    if (!selectedMembership) return null;
    const rawUserCode =
      user?.phone ||
      user?.full_name?.replace(/[^a-zA-Z0-9]/g, "") ||
      user?.id ||
      "HOIVIEN";
    const transferContent = `GYMAI GH${selectedMembership.id} ${rawUserCode}`.toUpperCase();

    const vietQrUrl = `https://img.vietqr.io/image/MB-18082006999-compact2.png?amount=${calculatedPrice}&addInfo=${encodeURIComponent(
      transferContent
    )}&accountName=TA%20QUANG%20NAM`;

    const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      `GymAI_Renew_${selectedMembership.id}_${calculatedPrice}_${transferContent}`
    )}`;

    return {
      bankName: "MB Bank (Ngân Hàng Quân Đội)",
      accountNumber: "18082006999",
      accountName: "TA QUANG NAM",
      amount: calculatedPrice,
      content: transferContent,
      vietQrUrl,
      fallbackQrUrl,
    };
  }, [selectedMembership, calculatedPrice, user]);

  // Submit Renewal
  const handleConfirmRenew = async () => {
    if (!selectedMembership) return;
    setSubmitting(true);

    try {
      const parsedKg = parseFloat(targetWeightKg);
      let formattedGoalNotes = goalNotes.trim();
      if (!formattedGoalNotes && parsedKg > 0) {
        formattedGoalNotes = `Mục tiêu ${goalType === "lose" ? "giảm" : "tăng"} ${parsedKg}kg - Gia hạn ${currentDurationObj.label}`;
      }

      const payload = {
        duration_days: currentDurationObj.days,
        custom_amount: calculatedPrice,
        target_weight_kg: !isNaN(parsedKg) && parsedKg > 0 ? parsedKg : null,
        goal_notes: formattedGoalNotes || null,
        payment_method: "transfer",
        transaction_code: `RENEW-QR-${Date.now()}`,
      };

      const updated = await membershipService.renewMembership(selectedMembership.id, payload);
      toastSuccess(
        `🎉 Gia hạn thành công gói "${updated.package?.name || selectedMembership.package?.name}" thêm ${currentDurationObj.label}! Gói đã được chuyển sang trạng thái Hoạt động (Active).`
      );

      closeRenewModal();
      fetchMyMemberships();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Gia hạn gói tập không thành công. Vui lòng thử lại hoặc liên hệ lễ tân.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const activeCount = memberships.filter((m) => m.status === "active").length;
  const expiredCount = memberships.filter((m) => m.status === "expired").length;

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER                                                            */}
      {/* ========================================================================= */}
      <div className="relative bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 p-7 sm:p-9 rounded-3xl text-white shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80')] bg-cover bg-center opacity-15 pointer-events-none mix-blend-overlay"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-3">
            <CreditCard className="w-3.5 h-3.5 text-cyan-200" />
            Hội viên Gym AI
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Gói Tập Đã Đăng Ký
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
            Quản lý thẻ tập cá nhân, theo dõi thời hạn hiệu lực, mục tiêu thể hình và chủ động gia hạn gói tập nhanh chóng qua chuyển khoản VietQR tự động.
          </p>
        </div>

        {/* Quick Summary Pill Stats */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/20 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <span className="text-[11px] font-medium text-blue-100 block">Tổng gói đăng ký</span>
            <span className="text-xl sm:text-2xl font-black text-white">{memberships.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
            <span className="text-[11px] font-medium text-emerald-100 block">Đang hoạt động</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-200">{activeCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-rose-100 block">Đã hết hạn</span>
            <span className="text-xl sm:text-2xl font-black text-rose-200">{expiredCount}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MEMBERSHIP CARDS LIST                                                  */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 h-64 animate-pulse">
              <div className="h-6 bg-slate-100 rounded-lg w-1/3 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded-lg w-3/4 mb-3"></div>
              <div className="h-16 bg-slate-100 rounded-xl mb-4"></div>
            </div>
          ))}
        </div>
      ) : memberships.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mx-auto text-blue-600">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800">
            Bạn chưa đăng ký gói tập nào
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Hãy khám phá các gói tập đa dạng được thiết kế chuyên biệt cho Nữ, Nam, Giảm cân, Tăng cơ hoặc Huấn luyện viên cá nhân để bắt đầu hành trình ngay hôm nay.
          </p>
          <div className="pt-2">
            <Link
              to="/member/packages"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all"
            >
              <Dumbbell className="w-4 h-4" />
              <span>Khám Phá & Đăng Ký Gói Tập</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {memberships.map((mem) => {
            const pkg = mem.package || {};
            const isActive = mem.status === "active";
            const isExpired = mem.status === "expired" || (mem.days_left !== undefined && mem.days_left < 0);
            const daysLeft = mem.days_left ?? 0;

            return (
              <div
                key={mem.id}
                className={`bg-white rounded-3xl border transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-lg relative overflow-hidden ${
                  isActive
                    ? "border-emerald-200 hover:border-emerald-300 ring-1 ring-emerald-100"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                {/* Decorative background glow for active membership */}
                {isActive && (
                  <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
                )}

                <div>
                  {/* Top Bar: Badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {pkg.badge || "Thẻ Tập Gym AI"}
                    </span>

                    {/* Status Badge */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Đang hoạt động (Active)
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        Đã hết hạn (Expired)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Chờ kích hoạt ({mem.status})
                      </span>
                    )}
                  </div>

                  {/* Package Name */}
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                    {pkg.name || `Gói tập #${mem.package_id}`}
                  </h3>

                  {/* Description if present */}
                  {pkg.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {pkg.description}
                    </p>
                  )}

                  {/* Date Range & Remaining Countdown Box */}
                  <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>
                          <strong>Bắt đầu:</strong> {formatDate(mem.start_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>
                          <strong>Hết hạn:</strong> {formatDate(mem.end_date)}
                        </span>
                      </div>
                    </div>

                    {/* Days Remaining Pill */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Thời hạn còn lại:
                      </span>
                      {isActive ? (
                        daysLeft > 7 ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black shadow-2xs">
                            Còn {daysLeft} ngày
                          </span>
                        ) : daysLeft > 0 ? (
                          <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-black animate-pulse">
                            Sắp hết hạn: Còn {daysLeft} ngày
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-black">
                            Hết hạn hôm nay
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 text-xs font-black">
                          Đã hết hạn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Goal Info Card (Mục tiêu tập luyện) */}
                  {(mem.target_weight_kg || mem.goal_notes) && (
                    <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-amber-900 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-gym-accent" />
                          <span>Mục tiêu thể hình:</span>
                        </div>
                        {mem.target_weight_kg && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-black">
                            {mem.goal_notes?.toLowerCase().includes("tăng") ? "+" : "-"}
                            {mem.target_weight_kg} kg
                          </span>
                        )}
                      </div>
                      {mem.goal_notes && (
                        <p className="text-slate-600 font-medium leading-relaxed pl-5">
                          {mem.goal_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom CTA Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 font-medium">
                    Giá gốc: <strong className="text-slate-700">{formatVND(pkg.price)}</strong>
                  </div>

                  <button
                    onClick={() => openRenewModal(mem)}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center gap-2 group"
                  >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span>Gia hạn gói tập</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: RENEWAL CONFIGURATION & VIETQR PAYMENT                          */}
      {/* ========================================================================= */}
      {selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                    Gia Hạn Gói Tập
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Gia hạn gói: <strong className="text-slate-800">{selectedMembership.package?.name}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeRenewModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Step 1: Duration Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  1. Chọn thời hạn gia hạn mới:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {durationOptions.map((opt) => {
                    const isSelected = durationOption === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setDurationOption(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-blue-50/90 border-blue-600 shadow-sm ring-1 ring-blue-600 text-blue-600"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-extrabold ${isSelected ? "text-blue-600" : "text-slate-900"}`}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-1">({opt.days} ngày)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Target Weight Goal (Optional) */}
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-950">
                  <Target className="w-4 h-4 text-blue-600" />
                  2. Mục tiêu thể hình trong chu kỳ mới (Tùy chọn)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Loại mục tiêu:
                    </label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    >
                      <option value="lose">Giảm cân / Giảm mỡ</option>
                      <option value="gain">Tăng cân / Tăng cơ nạc</option>
                      <option value="maintain">Duy trì vóc dáng & Sức bền</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số kilôgam (kg) mục tiêu:
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="30"
                      step="0.5"
                      value={targetWeightKg}
                      onChange={(e) => setTargetWeightKg(e.target.value)}
                      placeholder="VD: 4.5"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú chi tiết mục tiêu:
                  </label>
                  <input
                    type="text"
                    value={goalNotes}
                    onChange={(e) => setGoalNotes(e.target.value)}
                    placeholder="VD: Siết eo dưới, tập trung bài Compound & Cardio 3 buổi/tuần"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Step 3: VietQR Payment Display */}
              {qrTransferData && (
                <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    3. Thông tin thanh toán chuyển khoản qua VietQR
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* QR Code Container */}
                    <div className="relative p-2.5 bg-white border-2 border-blue-200 rounded-2xl shadow-sm flex-shrink-0">
                      <img
                        src={qrTransferData.vietQrUrl}
                        alt="VietQR Payment Code"
                        className="w-44 h-44 object-contain rounded-xl"
                        onError={(e) => {
                          e.currentTarget.src = qrTransferData.fallbackQrUrl;
                        }}
                      />
                      <div className="text-[10px] text-center font-bold text-slate-600 mt-1">
                        MB Bank • 18082006999
                      </div>
                    </div>

                    {/* Bank Transfer Details with Copy buttons */}
                    <div className="w-full space-y-2 text-xs">
                      {/* Bank Name */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="text-slate-500">Ngân hàng:</span>
                        <span className="font-bold text-slate-800">{qrTransferData.bankName}</span>
                      </div>

                      {/* Account Number */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="text-slate-500">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-blue-600 text-sm tracking-wider">
                            {qrTransferData.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(qrTransferData.accountNumber, "acc")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Sao chép STK"
                          >
                            {copiedField === "acc" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Account Name */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="text-slate-500">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-800 uppercase">
                          {qrTransferData.accountName}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <span className="text-slate-500">Số tiền gia hạn:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-emerald-600 text-sm">
                            {formatVND(qrTransferData.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(qrTransferData.amount), "amt")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Sao chép số tiền"
                          >
                            {copiedField === "amt" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Transfer Content */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-slate-500">Nội dung CK:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded border border-blue-200 text-xs">
                            {qrTransferData.content}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(qrTransferData.content, "msg")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Sao chép nội dung"
                          >
                            {copiedField === "msg" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notice */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Sau khi chuyển khoản qua ứng dụng ngân hàng, vui lòng nhấn nút{" "}
                      <strong>"Tôi đã chuyển khoản thành công"</strong> bên dưới để hoàn tất gia hạn và tự động kích hoạt trạng thái gói tập.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeRenewModal}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleConfirmRenew}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xử lý gia hạn...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tôi đã chuyển khoản thành công</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyMemberships;
