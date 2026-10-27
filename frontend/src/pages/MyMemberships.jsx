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
    { id: "1_month", label: "1 Tháng", days: 30, multiplier: 1, badge: null },
    { id: "3_months", label: "3 Tháng", days: 90, multiplier: 3 * 0.95, badge: "-5%" },
    { id: "6_months", label: "6 Tháng", days: 180, multiplier: 6 * 0.9, badge: "-10%" },
    { id: "12_months", label: "12 Tháng", days: 365, multiplier: 12 * 0.8, badge: "-20%" },
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
    <div className="space-y-8 pb-16 w-full">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER                                                            */}
      {/* ========================================================================= */}
      <div className="relative bg-slate-900/85 backdrop-blur-2xl p-7 sm:p-9 rounded-3xl text-white border border-slate-800/80 shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80')] bg-cover bg-center opacity-15 pointer-events-none mix-blend-screen"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 backdrop-blur-md text-cyan-300 text-xs font-black uppercase tracking-wider mb-3 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,200,255,0.25)]">
            <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Hội viên Gym AI Luxury</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            Gói Tập Đã Đăng Ký
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
            Quản lý thẻ tập cá nhân, theo dõi thời hạn hiệu lực, mục tiêu thể hình và chủ động gia hạn gói tập nhanh chóng qua chuyển khoản VietQR tự động.
          </p>
        </div>

        {/* Quick Summary Pill Stats */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block">Tổng gói đăng ký</span>
            <span className="text-xl sm:text-2xl font-black text-white">{memberships.length}</span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3 border border-slate-800">
            <span className="text-[11px] font-bold text-emerald-400 block">Đang hoạt động</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300">{activeCount}</span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-rose-400 block">Đã hết hạn</span>
            <span className="text-xl sm:text-2xl font-black text-rose-300">{expiredCount}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MEMBERSHIP CARDS LIST                                                  */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 animate-pulse h-64">
              <div className="h-6 bg-slate-800 rounded-lg w-1/3 mb-4"></div>
              <div className="h-8 bg-slate-700 rounded-lg w-3/4 mb-3"></div>
              <div className="h-16 bg-slate-800 rounded-xl mb-4"></div>
            </div>
          ))}
        </div>
      ) : memberships.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900/80 backdrop-blur-xl p-12 rounded-3xl border border-slate-800 text-center shadow-2xl max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-md">
            <CreditCard className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">
            Bạn chưa đăng ký gói tập nào
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
            Hãy khám phá các gói tập đa dạng được thiết kế chuyên biệt cho Nữ, Nam, Giảm cân, Tăng cơ hoặc Huấn luyện viên cá nhân để bắt đầu hành trình ngay hôm nay.
          </p>
          <div className="pt-2">
            <Link
              to="/member/packages"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl gradient-btn-primary hover:opacity-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-cyan-500/25 transition-all"
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
                className={`bg-slate-900/75 backdrop-blur-xl rounded-3xl border transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between shadow-2xl hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,200,255,0.2)] hover:-translate-y-1.5 relative overflow-hidden ${
                  isActive
                    ? "border-emerald-500/40"
                    : "border-slate-800"
                }`}
              >
                <div>
                  {/* Top Bar: Membership ID & Status */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Mã thẻ: <strong className="text-cyan-400 font-black">#MB-{mem.id}</strong>
                    </span>

                    {/* Status Badge */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Đang hoạt động (Active)
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        Đã hết hạn (Expired)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Chờ kích hoạt ({mem.status})
                      </span>
                    )}
                  </div>

                  {/* Package Name */}
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                    {pkg.name || `Gói tập #${mem.package_id}`}
                  </h3>

                  {/* Description if present */}
                  {pkg.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed font-medium">
                      {pkg.description}
                    </p>
                  )}

                  {/* Date Range & Remaining Countdown Box */}
                  <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300 font-semibold">
                        <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span>
                          <strong>Bắt đầu:</strong> {formatDate(mem.start_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300 font-semibold">
                        <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span>
                          <strong>Hết hạn:</strong> {formatDate(mem.end_date)}
                        </span>
                      </div>
                    </div>

                    {/* Days Remaining Pill */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">
                        Thời hạn còn lại:
                      </span>
                      {isActive ? (
                        daysLeft > 7 ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-black shadow-xs border border-emerald-500/30">
                            Còn {daysLeft} ngày
                          </span>
                        ) : daysLeft > 0 ? (
                          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-black animate-pulse border border-amber-500/30">
                            Sắp hết hạn: Còn {daysLeft} ngày
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30">
                            Hết hạn hôm nay
                          </span>
                        )
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/30">
                          Đã hết hạn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Goal Info Card (Mục tiêu thể hình) */}
                  {(mem.target_weight_kg || mem.goal_notes) && (
                    <div className="mt-3.5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-cyan-300 font-extrabold">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-cyan-400" />
                          <span>Mục tiêu thể hình:</span>
                        </div>
                        {mem.target_weight_kg && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-black">
                            {mem.goal_notes?.toLowerCase().includes("tăng") ? "+" : "-"}
                            {mem.target_weight_kg} kg
                          </span>
                        )}
                      </div>
                      {mem.goal_notes && (
                        <p className="text-slate-300 font-medium leading-relaxed pl-5">
                          {mem.goal_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom CTA Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 font-semibold">
                    Giá gốc: <strong className="text-cyan-400 text-sm font-black">{formatVND(pkg.price)}</strong>
                  </div>

                  <button
                    onClick={() => openRenewModal(mem)}
                    className="py-2.5 px-5 rounded-2xl gradient-btn-primary hover:opacity-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 group cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-2xl w-full max-w-2xl rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-white">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg sm:text-xl tracking-tight">
                    Gia Hạn Gói Tập
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Gia hạn gói: <strong className="text-cyan-300">{selectedMembership.package?.name}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeRenewModal}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Step 1: Duration Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
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
                            ? "bg-cyan-500/15 border-cyan-500 shadow-lg shadow-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${isSelected ? "text-cyan-300" : "text-white"}`}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Target className="w-4 h-4 text-cyan-400" />
                  2. Mục tiêu thể hình trong chu kỳ mới (Tùy chọn)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Loại mục tiêu:
                    </label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="lose">Giảm cân / Giảm mỡ</option>
                      <option value="gain">Tăng cân / Tăng cơ nạc</option>
                      <option value="maintain">Duy trì vóc dáng & Sức bền</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
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
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Ghi chú chi tiết mục tiêu:
                  </label>
                  <input
                    type="text"
                    value={goalNotes}
                    onChange={(e) => setGoalNotes(e.target.value)}
                    placeholder="VD: Siết eo dưới, tập trung bài Compound & Cardio 3 buổi/tuần"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Step 3: VietQR Payment Display */}
              {qrTransferData && (
                <div className="border border-slate-800 rounded-2xl p-4 sm:p-5 bg-slate-950/80 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    3. Thông tin thanh toán chuyển khoản qua VietQR
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* QR Code Container */}
                    <div className="relative p-2.5 bg-white border border-cyan-500/30 rounded-2xl shadow-lg flex-shrink-0">
                      <img
                        src={qrTransferData.vietQrUrl}
                        alt="VietQR Payment Code"
                        className="w-44 h-44 object-contain rounded-xl"
                        onError={(e) => {
                          e.currentTarget.src = qrTransferData.fallbackQrUrl;
                        }}
                      />
                      <div className="text-[10px] text-center font-bold text-slate-800 mt-1">
                        MB Bank • 18082006999
                      </div>
                    </div>

                    {/* Bank Transfer Details with Copy buttons */}
                    <div className="w-full space-y-2 text-xs">
                      {/* Bank Name */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Ngân hàng:</span>
                        <span className="font-bold text-slate-200">{qrTransferData.bankName}</span>
                      </div>

                      {/* Account Number */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-cyan-400 text-sm tracking-wider">
                            {qrTransferData.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(qrTransferData.accountNumber, "acc")}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Sao chép STK"
                          >
                            {copiedField === "acc" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Account Name */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-200 uppercase">
                          {qrTransferData.accountName}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="text-slate-400">Số tiền gia hạn:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-emerald-400 text-sm">
                            {formatVND(qrTransferData.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(qrTransferData.amount), "amt")}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Sao chép số tiền"
                          >
                            {copiedField === "amt" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Transfer Content */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-slate-400">Nội dung CK:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-xs">
                            {qrTransferData.content}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(qrTransferData.content, "msg")}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Sao chép nội dung"
                          >
                            {copiedField === "msg" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notice */}
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/50 rounded-xl flex items-start gap-2 text-[11px] text-cyan-200 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Sau khi chuyển khoản qua ứng dụng ngân hàng, vui lòng nhấn nút{" "}
                      <strong className="text-white">"Tôi đã chuyển khoản thành công"</strong> bên dưới để hoàn tất gia hạn và tự động kích hoạt trạng thái gói tập.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeRenewModal}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleConfirmRenew}
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
