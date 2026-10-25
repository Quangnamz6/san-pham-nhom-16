import React, { useState, useEffect, useMemo } from "react";
import { packageService } from "../services/packageService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Dumbbell,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Award,
  Zap,
  Target,
  X,
  TrendingDown,
  TrendingUp,
  GraduationCap,
  Heart,
  ChevronRight,
  Check,
  QrCode,
  Copy,
  AlertCircle,
} from "lucide-react";

export const MemberPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal configuration states
  const [durationOption, setDurationOption] = useState("1_month"); // "1_week", "15_days", "1_month", "3_months", "6_months", "12_months"
  const [targetWeightKg, setTargetWeightKg] = useState("5");
  const [paymentMethod, setPaymentMethod] = useState("transfer");

  // Mock QR payment states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrPendingPayload, setQrPendingPayload] = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const { user } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();

  const handleCopy = (text, fieldName) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toastInfo(`Đã sao chép: ${text}`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await packageService.getPackages();
      setPackages(data || []);
    } catch (err) {
      toastError("Không thể tải danh sách gói tập.");
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  // Filter tabs definition
  const filterTabs = [
    { id: "all", label: "Tất Cả Gói", icon: Sparkles },
    { id: "female", label: "Cho Nữ", icon: Heart },
    { id: "male", label: "Cho Nam", icon: Dumbbell },
    { id: "gain_muscle", label: "Tăng Cân / Tăng Cơ", icon: TrendingUp },
    { id: "lose_weight", label: "Giảm Cân / Giảm Mỡ", icon: Flame },
    { id: "personal_trainer", label: "Gói PT Cá Nhân", icon: Award },
    { id: "student", label: "Gói Sinh Viên", icon: GraduationCap },
  ];

  // Duration options with multipliers and discounts
  const durationOptions = [
    { id: "1_week", label: "1 Tuần", days: 7, multiplier: 7 / 30, discountBadge: null },
    { id: "15_days", label: "15 Ngày", days: 15, multiplier: 15 / 30, discountBadge: null },
    { id: "1_month", label: "1 Tháng", days: 30, multiplier: 1, discountBadge: "Chuẩn" },
    { id: "3_months", label: "3 Tháng", days: 90, multiplier: 3 * 0.95, discountBadge: "-5%" },
    { id: "6_months", label: "6 Tháng", days: 180, multiplier: 6 * 0.9, discountBadge: "-10%" },
    { id: "12_months", label: "12 Tháng", days: 365, multiplier: 12 * 0.8, discountBadge: "Tiết kiệm 20%" },
  ];

  // Filter packages based on tab
  const filteredPackages = useMemo(() => {
    if (activeTab === "all") return packages;
    return packages.filter((pkg) => {
      const cat = (pkg.category || "").toLowerCase();
      return cat === activeTab.toLowerCase();
    });
  }, [packages, activeTab]);

  // Selected duration object
  const currentDurationObj = useMemo(() => {
    return durationOptions.find((d) => d.id === durationOption) || durationOptions[2];
  }, [durationOption]);

  // Calculate dynamic price based on duration
  const calculatedPrice = useMemo(() => {
    if (!selectedPackage) return 0;
    const basePrice = Number(selectedPackage.price) || 0;
    return Math.round((basePrice * currentDurationObj.multiplier) / 10000) * 10000;
  }, [selectedPackage, currentDurationObj]);

  // Check if selected package is Weight Gain or Loss
  const isWeightGoalPackage = useMemo(() => {
    if (!selectedPackage) return false;
    const cat = (selectedPackage.category || "").toLowerCase();
    const name = (selectedPackage.name || "").toLowerCase();
    return (
      cat === "lose_weight" ||
      cat === "gain_muscle" ||
      name.includes("giảm cân") ||
      name.includes("tăng cân") ||
      name.includes("siết mỡ") ||
      name.includes("giảm mỡ")
    );
  }, [selectedPackage]);

  const isLoseWeight = useMemo(() => {
    if (!selectedPackage) return false;
    const cat = (selectedPackage.category || "").toLowerCase();
    const name = (selectedPackage.name || "").toLowerCase();
    return cat === "lose_weight" || name.includes("giảm");
  }, [selectedPackage]);

  // AI Guidance calculation based on target kg
  const aiAdvice = useMemo(() => {
    const kg = parseFloat(targetWeightKg) || 0;
    if (kg <= 0) return null;

    if (isLoseWeight) {
      // Giảm mỡ an toàn: 0.5kg - 1kg / tuần
      const weeksEst = Math.max(2, Math.round(kg / 0.75));
      const dailyDeficitKcal = 500;
      return {
        estimatedWeeks: weeksEst,
        estimatedMonths: (weeksEst / 4).toFixed(1),
        dailyKcal: `Thâm hụt ~${dailyDeficitKcal} kcal/ngày`,
        recommendation: `Để giảm ${kg}kg an toàn chuẩn y khoa, bạn nên duy trì 4 buổi tập/tuần (kết hợp Cardio Zone 2 và tạ kháng lực) cùng chế độ ăn thâm hụt calo nhẹ nhàng, không nhịn ăn tiêu cực.`,
        commitmentMsg: `Với lộ trình này, bạn hoàn toàn có thể chạm mốc giảm ${kg}kg sau khoảng ${weeksEst} tuần!`,
      };
    } else {
      // Tăng cơ an toàn: 1 - 2kg / tháng
      const weeksEst = Math.max(3, Math.round(kg / 0.5));
      const dailySurplusKcal = 400;
      return {
        estimatedWeeks: weeksEst,
        estimatedMonths: (weeksEst / 4).toFixed(1),
        dailyKcal: `Bổ sung dư ~${dailySurplusKcal} kcal/ngày`,
        recommendation: `Để tăng ${kg}kg cơ nạc hạn chế tích mỡ, hãy tập trung vào các bài Compound (Squat, Deadlift, Bench Press) và nạp đủ 1.6 - 2.0g Protein/kg thể trọng mỗi ngày.`,
        commitmentMsg: `Lộ trình dinh dưỡng & tập luyện sẽ giúp bạn đạt thêm ${kg}kg cơ bắp săn chắc sau khoảng ${weeksEst} tuần!`,
      };
    }
  }, [targetWeightKg, isLoseWeight]);

  // Open Registration Modal
  const openPackageModal = (pkg) => {
    setSelectedPackage(pkg);
    setDurationOption("1_month");
    setTargetWeightKg("5");
    setPaymentMethod("transfer");
  };

  // Submit Package Registration
  const handleRegisterPackage = async (e) => {
    e.preventDefault();
    if (!selectedPackage) return;

    const payload = {
      package_id: selectedPackage.id,
      user_id: user?.id,
      duration_days: currentDurationObj.days,
      custom_amount: calculatedPrice,
      target_weight_kg: isWeightGoalPackage ? parseFloat(targetWeightKg) || null : null,
      goal_notes: isWeightGoalPackage
        ? `Mục tiêu: ${isLoseWeight ? "Giảm" : "Tăng"} ${targetWeightKg}kg - Thời hạn ${currentDurationObj.label}`
        : `Đăng ký gói ${selectedPackage.name} - Thời hạn ${currentDurationObj.label}`,
      payment_method: paymentMethod,
    };

    // Luồng thanh toán quét mã QR Giả định (Mock VietQR Payment)
    if (paymentMethod === "transfer") {
      const rawUserCode =
        user?.phone ||
        user?.full_name?.replace(/[^a-zA-Z0-9]/g, "") ||
        user?.id ||
        "HOIVIEN";
      const transferContent = `GYMAI ${rawUserCode}`.toUpperCase();

      // Sinh URL mã QR VietQR động (chính xác số tiền và nội dung)
      const vietQrUrl = `https://img.vietqr.io/image/MB-18082006999-compact2.png?amount=${calculatedPrice}&addInfo=${encodeURIComponent(
        transferContent
      )}&accountName=TA%20QUANG%20NAM`;

      const qrQuickUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
        `GymAI_Payment_${calculatedPrice}_${transferContent}`
      )}`;

      setQrData({
        bankName: "MB Bank (Ngân Hàng TMCP Quân Đội)",
        accountNumber: "18082006999",
        accountName: "TA QUANG NAM",
        amount: calculatedPrice,
        content: transferContent,
        vietQrUrl,
        backupQrUrl: qrQuickUrl,
      });

      setQrPendingPayload(payload);
      setIsQrModalOpen(true);
      return;
    }

    // Luồng thanh toán tiền mặt hoặc thẻ tại quầy
    setSubmitting(true);
    try {
      await packageService.renewPackage(payload);
      toastSuccess(
        `Đăng ký thành công gói "${selectedPackage.name}" (${currentDurationObj.label})! Gói tập của bạn đã được kích hoạt trạng thái Hoạt động (Active).`
      );
      setSelectedPackage(null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Đăng ký gói tập thất bại. Vui lòng liên hệ lễ tân để được hỗ trợ.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Xác nhận đã chuyển khoản thành công từ Modal QR
  const handleConfirmQrPayment = async () => {
    if (!qrPendingPayload) return;
    setIsVerifyingPayment(true);
    try {
      const finalPayload = {
        ...qrPendingPayload,
        payment_method: "transfer",
        transaction_code: `QR-MB-${Date.now()}`,
      };

      await packageService.renewPackage(finalPayload);

      toastSuccess(
        `🎉 Xác nhận chuyển khoản thành công! Gói tập "${selectedPackage?.name}" đã được kích hoạt trạng thái Hoạt động (Active)!`
      );
      setIsQrModalOpen(false);
      setSelectedPackage(null);
      setQrPendingPayload(null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Xác nhận thanh toán không thành công. Vui lòng thử lại.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // Hủy giao dịch QR
  const handleCancelQrPayment = () => {
    setIsQrModalOpen(false);
    setQrPendingPayload(null);
    toastInfo("Đã đóng giao dịch quét mã QR.");
  };

  // Helper for Category color badges
  const getCategoryTheme = (category) => {
    switch (category?.toLowerCase()) {
      case "female":
        return {
          bg: "bg-pink-50 text-pink-700 border-pink-200",
          accent: "from-pink-500 to-rose-500",
          cardBorder: "hover:border-pink-300",
        };
      case "male":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          accent: "from-blue-600 to-indigo-600",
          cardBorder: "hover:border-blue-300",
        };
      case "gain_muscle":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          accent: "from-amber-500 to-orange-500",
          cardBorder: "hover:border-amber-300",
        };
      case "lose_weight":
        return {
          bg: "bg-red-50 text-red-700 border-red-200",
          accent: "from-red-500 to-orange-500",
          cardBorder: "hover:border-red-300",
        };
      case "personal_trainer":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          accent: "from-purple-600 to-indigo-600",
          cardBorder: "hover:border-purple-300",
        };
      case "student":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          accent: "from-emerald-500 to-teal-500",
          cardBorder: "hover:border-emerald-300",
        };
      default:
        return {
          bg: "bg-orange-50 text-orange-700 border-orange-200",
          accent: "from-gym-accent to-amber-500",
          cardBorder: "hover:border-orange-300",
        };
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER */}
      {/* ========================================================================= */}
      <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-7 sm:p-9 rounded-3xl text-white shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80')] bg-cover bg-center opacity-15 pointer-events-none mix-blend-overlay"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            Đặc quyền Hội viên Gym AI
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Gói Tập Dịch Vụ & Lộ Trình Thể Hình
          </h1>
          <p className="text-orange-100 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
            Tự do lựa chọn gói tập phù hợp với mục tiêu của bạn: Săn chắc cho Nữ, Tăng cơ cho Nam, Giảm mỡ cấp tốc, Huấn luyện viên 1:1 hoặc Trợ giá Sinh viên.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABS FILTERING BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-gym-accent text-white shadow-md shadow-orange-500/25 scale-[1.02]"
                  : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 hover:-translate-y-0.5"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. PACKAGE CARDS GRID */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 h-80 animate-pulse">
              <div className="h-6 bg-slate-100 rounded-lg w-1/3 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded-lg w-3/4 mb-3"></div>
              <div className="h-12 bg-slate-100 rounded-xl mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
          <Dumbbell className="w-12 h-12 mx-auto text-slate-300 mb-3 stroke-[1.5]" />
          <p className="font-bold text-slate-700">Chưa có gói tập nào trong danh mục này.</p>
          <p className="text-xs text-slate-400 mt-1">Vui lòng chọn danh mục "Tất Cả Gói" để xem đầy đủ.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => {
            const theme = getCategoryTheme(pkg.category);
            const benefitsList = (pkg.benefits || "").split(";").filter((b) => b.trim());

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group relative ${theme.cardBorder}`}
              >
                <div>
                  {/* Top Header: Badge & Days */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${theme.bg}`}>
                      {pkg.badge || "Gói Tập"}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {pkg.duration_days} ngày
                    </span>
                  </div>

                  {/* Package Name */}
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 group-hover:text-gym-accent transition-colors leading-snug">
                    {pkg.name}
                  </h3>

                  {/* Price */}
                  <div className="mt-3 pb-4 border-b border-slate-100">
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {formatVND(pkg.price)}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Thời hạn gốc {pkg.duration_days} ngày (Có thể tùy chỉnh theo tuần/tháng)
                    </span>
                  </div>

                  {/* Description */}
                  {pkg.description && (
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed line-clamp-2 font-medium">
                      {pkg.description}
                    </p>
                  )}

                  {/* Benefits Preview */}
                  <div className="mt-4 space-y-2">
                    {benefitsList.slice(0, 3).map((ben, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{ben.trim()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quality Commitment highlight if any */}
                  {pkg.commitments && (
                    <div className="mt-4 p-2.5 rounded-xl bg-orange-50/70 border border-orange-100 text-[11px] text-orange-800 font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-gym-accent flex-shrink-0" />
                      <span className="line-clamp-1">{pkg.commitments}</span>
                    </div>
                  )}
                </div>

                {/* Bottom CTA Button */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => openPackageModal(pkg)}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-gym-accent text-white font-bold text-xs sm:text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-orange-500/25"
                  >
                    <span>Xem chi tiết & Đăng ký</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: PACKAGE DETAILS & REGISTRATION CONFIGURATION                   */}
      {/* ========================================================================= */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-200 relative my-8 text-left max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedPackage(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-orange-50 text-orange-700 border border-orange-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-gym-accent" />
                {selectedPackage.badge || "Gói Dịch Vụ"}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {selectedPackage.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">
                {selectedPackage.description}
              </p>
            </div>

            {/* Quality Commitment Banner */}
            {selectedPackage.commitments && (
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200 text-xs text-orange-950 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-gym-accent flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-orange-700 uppercase tracking-wider block mb-0.5">
                    Cam kết chất lượng từ Gym AI:
                  </span>
                  <span className="font-semibold leading-relaxed">{selectedPackage.commitments}</span>
                </div>
              </div>
            )}

            {/* Full Benefits List */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Quyền lợi chi tiết đi kèm gói:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(selectedPackage.benefits || "").split(";").map((ben, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{ben.trim()}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleRegisterPackage} className="mt-6 pt-5 border-t border-slate-200 space-y-5">
              {/* Duration selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Chọn thời hạn đăng ký gói tập:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {durationOptions.map((opt) => {
                    const isSelected = durationOption === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setDurationOption(opt.id)}
                        className={`p-3 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? "bg-orange-50/80 border-gym-accent shadow-sm ring-1 ring-gym-accent"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-extrabold ${isSelected ? "text-gym-accent" : "text-slate-900"}`}>
                            {opt.label}
                          </span>
                          {opt.discountBadge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              {opt.discountBadge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-1">({opt.days} ngày)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Special Input for Weight Gain / Loss Goal */}
              {isWeightGoalPackage && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
                    <Target className="w-4 h-4 text-gym-accent" />
                    Mục tiêu thể hình cá nhân (AI Health Optimizer)
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số kilôgam (kg) bạn muốn {isLoseWeight ? "giảm" : "tăng"}?
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="0.5"
                        required
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(e.target.value)}
                        placeholder="VD: 5"
                        className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-center focus:outline-none focus:border-gym-accent"
                      />
                      <span className="text-xs font-bold text-slate-600">kg mục tiêu</span>
                    </div>
                  </div>

                  {/* AI Prediction Box */}
                  {aiAdvice && (
                    <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-amber-800 font-bold">
                        <span>🤖 Gợi ý từ AI Thể hình:</span>
                        <span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                          Lộ trình ~{aiAdvice.estimatedWeeks} tuần ({aiAdvice.estimatedMonths} tháng)
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {aiAdvice.recommendation}
                      </p>
                      <div className="text-emerald-700 font-semibold pt-1">
                        🎯 {aiAdvice.commitmentMsg}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Phương thức thanh toán:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    { id: "transfer", label: "Chuyển khoản (QR / Banking)", icon: CreditCard },
                    { id: "cash", label: "Tiền mặt tại quầy lễ tân", icon: UserCheck },
                    { id: "card", label: "Quẹt thẻ POS phòng gym", icon: Zap },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        paymentMethod === m.id
                          ? "bg-slate-900 text-white border-slate-900 font-bold shadow-md"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      <m.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Calculation & Confirm CTA */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Tổng phí thanh toán:</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-gym-accent">
                    {formatVND(calculatedPrice)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Gói {currentDurationObj.label} - {currentDurationObj.days} ngày tập luyện)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPackage(null)}
                    className="px-4 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-colors"
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Xác Nhận Đăng Ký / Thanh Toán</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quét mã QR Thanh Toán Giả Định (Mock QR Code Payment) */}
      {isQrModalOpen && qrData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gym-accent/10 border border-gym-accent/20 flex items-center justify-center text-gym-accent">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    Quét Mã QR Thanh Toán
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Chuyển khoản VietQR / Napas247 kích hoạt tự động
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelQrPayment}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Image & Instructions */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* QR Box */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative p-2.5 bg-white border-2 border-orange-200 rounded-2xl shadow-md">
                  <img
                    src={qrData.vietQrUrl}
                    alt="VietQR Payment"
                    className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
                    onError={(e) => {
                      // Fallback sang QR server nếu ảnh VietQR không load được
                      e.currentTarget.src = qrData.backupQrUrl;
                    }}
                  />
                  {/* Subtle Badge */}
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow whitespace-nowrap">
                    Quét bằng App Ngân Hàng bất kỳ
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 mt-4 font-medium">
                  Hỗ trợ Vietcombank, Techcombank, MB Bank, Momo, ViettelMoney...
                </span>
              </div>

              {/* Banking Details Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 text-xs">
                {/* Bank Name */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ngân hàng:</span>
                  <span className="font-bold text-slate-900 text-right">{qrData.bankName}</span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-gym-accent tracking-wider text-sm">
                      {qrData.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(qrData.accountNumber, "acc")}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Sao chép số tài khoản"
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
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-900 text-right uppercase">
                    {qrData.accountName}
                  </span>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Số tiền thanh toán:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-emerald-600 text-sm">
                      {formatVND(qrData.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(qrData.amount), "amt")}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
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
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 text-xs">
                      {qrData.content}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(qrData.content, "msg")}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
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

              {/* Safety Notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Vui lòng chuyển khoản đúng số tiền và giữ nguyên mã nội dung để hệ thống tự động
                  kích hoạt trạng thái gói tập sang <strong>Hoạt động (Active)</strong> ngay sau khi xác nhận.
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handleCancelQrPayment}
                disabled={isVerifyingPayment}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
              >
                Hủy giao dịch
              </button>

              <button
                type="button"
                onClick={handleConfirmQrPayment}
                disabled={isVerifyingPayment}
                className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang kích hoạt gói tập...</span>
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
