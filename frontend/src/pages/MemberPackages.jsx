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
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Tag,
  AlertTriangle,
} from "lucide-react";

export const MemberPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal configuration states for Registration
  const [durationOption, setDurationOption] = useState("1_month"); // "1_week", "15_days", "1_month", "3_months", "6_months", "12_months"
  const [targetWeightKg, setTargetWeightKg] = useState("5");
  const [paymentMethod, setPaymentMethod] = useState("transfer");

  // Mock QR payment states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrPendingPayload, setQrPendingPayload] = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Admin Management States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [packageFormData, setPackageFormData] = useState({
    name: "",
    category: "all",
    badge: "Tiêu Chuẩn",
    price: 500000,
    duration_days: 30,
    description: "",
    benefits: "",
    commitments: "",
    featured: false,
  });

  // Admin Delete Confirmation States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const { user, role } = useAuth();
  const isAdmin = user?.role === "admin" || role === "admin";
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

  // Category options for Admin Form
  const categoryOptions = [
    { value: "all", label: "Tất Cả / Gói Chung", defaultBadge: "Tiêu Chuẩn" },
    { value: "female", label: "Cho Nữ (Săn chắc & Thon gọn)", defaultBadge: "Dành Cho Nữ" },
    { value: "male", label: "Cho Nam (Cắt nét & Phát triển cơ)", defaultBadge: "Dành Cho Nam" },
    { value: "gain_muscle", label: "Tăng Cân / Tăng Cơ", defaultBadge: "Tăng Cơ" },
    { value: "lose_weight", label: "Giảm Cân / Giảm Mỡ Cấp Tốc", defaultBadge: "Giảm Cân" },
    { value: "personal_trainer", label: "Gói PT Cá Nhân 1-kèm-1", defaultBadge: "PT 1:1" },
    { value: "student", label: "Gói Học Sinh - Sinh Viên", defaultBadge: "Sinh Viên" },
  ];

  // Duration options with multipliers and discounts for Registration
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

  // Check if selected package is Weight Goal
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

  // ---------------------------------------------------------------------------
  // ADMIN HANDLERS (Create, Edit, Delete)
  // ---------------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingPackage(null);
    setPackageFormData({
      name: "",
      category: "all",
      badge: "Tiêu Chuẩn",
      price: 600000,
      duration_days: 30,
      description: "Không giới hạn số lần check-in, miễn phí tủ đồ thông minh và phòng tắm nóng lạnh hiện đại.",
      benefits: "Tập luyện không giới hạn khung giờ\nMiễn phí đo chỉ số InBody và tư vấn sức khỏe\nTủ đồ cá nhân khóa từ an toàn cao\nPhòng xông hơi đá muối Himalaya thư giãn",
      commitments: "Cam kết đồng hành và hướng dẫn kỹ thuật tập luyện chuẩn y khoa",
      featured: false,
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (pkg) => {
    setEditingPackage(pkg);
    // Convert semicolon benefits to newlines for friendly editing
    const friendlyBenefits = (pkg.benefits || "")
      .split(";")
      .map((b) => b.trim())
      .filter(Boolean)
      .join("\n");

    setPackageFormData({
      name: pkg.name || "",
      category: pkg.category || "all",
      badge: pkg.badge || "",
      price: pkg.price || 0,
      duration_days: pkg.duration_days || 30,
      description: pkg.description || "",
      benefits: friendlyBenefits,
      commitments: pkg.commitments || "",
      featured: Boolean(pkg.featured),
    });
    setIsFormModalOpen(true);
  };

  const handleCategoryChange = (e) => {
    const selectedCat = e.target.value;
    const catObj = categoryOptions.find((c) => c.value === selectedCat);
    setPackageFormData((prev) => ({
      ...prev,
      category: selectedCat,
      badge: prev.badge && prev.badge !== "Tiêu Chuẩn" && prev.badge !== "Gói Mới" ? prev.badge : (catObj?.defaultBadge || "Gói Tập"),
    }));
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!packageFormData.name.trim()) {
      toastError("Vui lòng nhập tên gói tập.");
      return;
    }
    if (Number(packageFormData.price) < 0) {
      toastError("Giá niêm yết không được là số âm.");
      return;
    }
    if (parseInt(packageFormData.duration_days, 10) <= 0) {
      toastError("Thời hạn gói tập phải lớn hơn 0 ngày.");
      return;
    }

    // Format benefits: split by newline or semicolon, filter empty, join with semicolon
    const normalizedBenefits = packageFormData.benefits
      .split(/[\n;]/)
      .map((b) => b.trim())
      .filter(Boolean)
      .join("; ");

    const payload = {
      name: packageFormData.name.trim(),
      category: packageFormData.category || "all",
      badge: packageFormData.badge?.trim() || null,
      price: Number(packageFormData.price) || 0,
      duration_days: parseInt(packageFormData.duration_days, 10) || 30,
      description: packageFormData.description?.trim() || null,
      benefits: normalizedBenefits || null,
      commitments: packageFormData.commitments?.trim() || null,
      featured: Boolean(packageFormData.featured),
    };

    setSavingPackage(true);
    try {
      if (editingPackage) {
        await packageService.updatePackage(editingPackage.id, payload);
        toastSuccess(`🎉 Cập nhật thành công gói tập "${payload.name}"!`);
      } else {
        await packageService.createPackage(payload);
        toastSuccess(`🎉 Tạo mới thành công gói tập "${payload.name}"!`);
      }
      setIsFormModalOpen(false);
      setEditingPackage(null);
      await loadPackages();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Lưu gói tập thất bại. Vui lòng kiểm tra lại thông tin.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSavingPackage(false);
    }
  };

  const confirmDeletePackage = (pkg) => {
    setDeletingPackage(pkg);
    setIsDeleteModalOpen(true);
  };

  const handleDeletePackage = async () => {
    if (!deletingPackage) return;
    setDeletingLoading(true);
    try {
      await packageService.deletePackage(deletingPackage.id);
      toastSuccess(`Đã xóa gói tập "${deletingPackage.name}" khỏi hệ thống!`);
      setIsDeleteModalOpen(false);
      setDeletingPackage(null);
      await loadPackages();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Không thể xóa gói tập do ràng buộc dữ liệu liên quan.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setDeletingLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // MEMBER REGISTRATION HANDLERS
  // ---------------------------------------------------------------------------
  const openPackageModal = (pkg) => {
    setSelectedPackage(pkg);
    setDurationOption("1_month");
    setTargetWeightKg("5");
    setPaymentMethod("transfer");
  };

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

    if (paymentMethod === "transfer") {
      const rawUserCode =
        user?.phone ||
        user?.full_name?.replace(/[^a-zA-Z0-9]/g, "") ||
        user?.id ||
        "HOIVIEN";
      const transferContent = `GYMAI ${rawUserCode}`.toUpperCase();

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

  const handleCancelQrPayment = () => {
    setIsQrModalOpen(false);
    setQrPendingPayload(null);
    toastInfo("Đã đóng giao dịch quét mã QR.");
  };

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
          bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
          accent: "from-cyan-600 to-blue-600",
          cardBorder: "hover:border-cyan-300",
        };
      case "lose_weight":
        return {
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          accent: "from-blue-500 to-cyan-500",
          cardBorder: "hover:border-sky-300",
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
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          accent: "from-blue-600 to-cyan-500",
          cardBorder: "hover:border-blue-300",
        };
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER & ADMIN ACTIONS                                            */}
      {/* ========================================================================= */}
      <div className="relative bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 p-7 sm:p-9 rounded-3xl text-white shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80')] bg-cover bg-center opacity-15 pointer-events-none mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              {isAdmin ? "Khu vực Quản trị Hệ thống Gói tập" : "Đặc quyền Hội viên Gym AI"}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Gói Tập Dịch Vụ & Lộ Trình Thể Hình
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
              {isAdmin
                ? "Quản trị viên có toàn quyền Thêm mới, Chỉnh sửa quyền lợi, học phí và Xóa gói tập dịch vụ đồng bộ toàn hệ thống."
                : "Tự do lựa chọn gói tập phù hợp với mục tiêu của bạn: Săn chắc cho Nữ, Tăng cơ cho Nam, Giảm mỡ cấp tốc, Huấn luyện viên 1:1 hoặc Trợ giá Sinh viên."}
            </p>
          </div>

          {/* Admin Header Action: + Thêm Gói Tập Mới */}
          {isAdmin && (
            <div className="flex-shrink-0">
              <button
                id="btn-add-package"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-600 hover:bg-blue-50 font-extrabold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 group"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <span>+ Thêm Gói Tập Mới</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABS FILTERING BAR                                                     */}
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
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
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
      {/* 3. PACKAGE CARDS GRID                                                     */}
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
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Bấm nút "+ Thêm Gói Tập Mới" ở phía trên để tạo gói tập đầu tiên.' : 'Vui lòng chọn danh mục "Tất Cả Gói" để xem đầy đủ.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => {
            const theme = getCategoryTheme(pkg.category);
            const benefitsList = (pkg.benefits || "")
              .split(/[\n;]/)
              .map((b) => b.trim())
              .filter(Boolean);

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group relative ${theme.cardBorder}`}
              >
                <div>
                  {/* Top Header: Badge, Duration & Admin Quick Action Buttons */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${theme.bg}`}>
                      {pkg.badge || "Gói Tập"}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {pkg.duration_days} ngày
                      </span>

                      {/* Admin Quick Buttons on Top Card */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 ml-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                          <button
                            id={`btn-edit-top-${pkg.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(pkg);
                            }}
                            title="Sửa gói tập"
                            className="p-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-top-${pkg.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeletePackage(pkg);
                            }}
                            title="Xóa gói tập"
                            className="p-1 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
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
                        <span className="line-clamp-1">{ben}</span>
                      </div>
                    ))}
                    {benefitsList.length > 3 && (
                      <span className="text-[11px] font-semibold text-slate-400 block pl-6">
                        + {benefitsList.length - 3} quyền lợi khác
                      </span>
                    )}
                  </div>

                  {/* Quality Commitment highlight if any */}
                  {pkg.commitments && (
                    <div className="mt-4 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="line-clamp-1">{pkg.commitments}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPackageModal(pkg)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <span>Xem chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-edit-bottom-${pkg.id}`}
                        onClick={() => openEditModal(pkg)}
                        className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200/80 transition-colors flex items-center justify-center gap-1"
                        title="Chỉnh sửa gói tập"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                      <button
                        id={`btn-delete-bottom-${pkg.id}`}
                        onClick={() => confirmDeletePackage(pkg)}
                        className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200/80 transition-colors flex items-center justify-center gap-1"
                        title="Xóa gói tập"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openPackageModal(pkg)}
                      className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-blue-500/25"
                    >
                      <span>Xem chi tiết & Đăng ký</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADMIN MODAL: THÊM / CHỈNH SỬA GÓI TẬP DỊCH VỤ                         */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-200 relative my-8 text-left max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                {editingPackage ? "Chỉnh Sửa Gói Tập" : "Thêm Gói Tập Mới"}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {editingPackage ? `Cập nhật gói "${editingPackage.name}"` : "Tạo Gói Tập Dịch Vụ Mới"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Dữ liệu sẽ được lưu trực tiếp vào CSDL và cập nhật đồng bộ cho toàn bộ hội viên & lễ tân.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePackage} className="space-y-4">
              {/* Tên gói tập */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên gói tập dịch vụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={packageFormData.name}
                  onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                  placeholder="VD: Gói Giảm Cân Cấp Tốc 1 Tháng"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
                />
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thẻ phân loại (Category) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={packageFormData.category}
                    onChange={handleCategoryChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm cursor-pointer"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Huy hiệu hiển thị (Badge)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={packageFormData.badge}
                      onChange={(e) => setPackageFormData({ ...packageFormData, badge: e.target.value })}
                      placeholder="VD: Giảm Cân, Hot, Cho Nữ..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
                    />
                    <Tag className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Price & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giá niêm yết (VND) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    required
                    value={packageFormData.price}
                    onChange={(e) => setPackageFormData({ ...packageFormData, price: e.target.value })}
                    placeholder="VD: 1500000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
                  />
                  <div className="mt-1 text-xs font-extrabold text-blue-600">
                    Quy đổi: {formatVND(packageFormData.price)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thời hạn gốc (Số ngày) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={packageFormData.duration_days}
                    onChange={(e) => setPackageFormData({ ...packageFormData, duration_days: e.target.value })}
                    placeholder="VD: 30"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm"
                  />
                  {/* Preset Quick Chips */}
                  <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { label: "7N", days: 7 },
                      { label: "15N", days: 15 },
                      { label: "1T (30N)", days: 30 },
                      { label: "3T (90N)", days: 90 },
                      { label: "6T (180N)", days: 180 },
                      { label: "12T (365N)", days: 365 },
                    ].map((chip) => (
                      <button
                        type="button"
                        key={chip.days}
                        onClick={() => setPackageFormData({ ...packageFormData, duration_days: chip.days })}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border font-bold whitespace-nowrap transition-colors ${
                          Number(packageFormData.duration_days) === chip.days
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mô tả ngắn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả ngắn gọn
                </label>
                <textarea
                  rows="2"
                  value={packageFormData.description}
                  onChange={(e) => setPackageFormData({ ...packageFormData, description: e.target.value })}
                  placeholder="VD: Lộ trình chuyên sâu kết hợp đo chỉ số InBody và tư vấn dinh dưỡng cá nhân hóa..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm"
                />
              </div>

              {/* Quyền lợi đi kèm */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Các quyền lợi đi kèm (Nhập mỗi quyền lợi trên 1 dòng hoặc cách nhau bởi dấu ;)
                  </label>
                </div>
                <textarea
                  rows="3"
                  value={packageFormData.benefits}
                  onChange={(e) => setPackageFormData({ ...packageFormData, benefits: e.target.value })}
                  placeholder={"Tập không giới hạn khung giờ\nMiễn phí đo chỉ số InBody định kỳ\nTủ đồ thông minh riêng biệt\n1 buổi tập kèm 1-1 với Huấn luyện viên"}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-mono leading-relaxed"
                />
                {/* Live Preview Tags */}
                {packageFormData.benefits && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Xem trước danh sách quyền lợi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {packageFormData.benefits
                        .split(/[\n;]/)
                        .map((b) => b.trim())
                        .filter(Boolean)
                        .map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {item}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cam kết chất lượng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cam kết chất lượng
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={packageFormData.commitments}
                    onChange={(e) => setPackageFormData({ ...packageFormData, commitments: e.target.value })}
                    placeholder="VD: Cam kết giảm 2-4kg trong 30 ngày hoặc hoàn lại 100% học phí"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm"
                  />
                  <ShieldCheck className="w-4 h-4 text-blue-600 absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Featured toggle */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={packageFormData.featured}
                  onChange={(e) => setPackageFormData({ ...packageFormData, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="featured-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Đánh dấu là Gói Tập Nổi Bật (Featured - Ưu tiên hiển thị đề xuất hàng đầu)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={savingPackage}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  id="btn-save-package"
                  disabled={savingPackage}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPackage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingPackage ? "Cập Nhật Gói Tập" : "Lưu Gói Tập Mới"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADMIN MODAL: XÁC NHẬN XÓA GÓI TẬP                                    */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && deletingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-200 relative text-left">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Xác nhận xóa gói tập?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn xóa gói tập <strong className="text-slate-900">"{deletingPackage.name}"</strong>? Gói tập sẽ bị gỡ bỏ vĩnh viễn khỏi danh sách đăng ký.
            </p>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium">
              💡 <strong>Lưu ý an toàn:</strong> Nếu gói tập này đã có hội viên đăng ký trong CSDL, hệ thống sẽ ngăn chặn việc xóa để bảo vệ tính toàn vẹn dữ liệu hợp đồng.
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingPackage(null);
                }}
                disabled={deletingLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                onClick={handleDeletePackage}
                disabled={deletingLoading}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {deletingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: PACKAGE DETAILS & REGISTRATION CONFIGURATION                   */}
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
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
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-cyan-500/5 border border-blue-200 text-xs text-blue-950 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-blue-700 uppercase tracking-wider block mb-0.5">
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
                {(selectedPackage.benefits || "")
                  .split(/[\n;]/)
                  .map((b) => b.trim())
                  .filter(Boolean)
                  .map((ben, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{ben}</span>
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
                            ? "bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-600"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-extrabold ${isSelected ? "text-blue-600" : "text-slate-900"}`}>
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
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800">
                    <Target className="w-4 h-4 text-blue-600" />
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
                      <span className="text-xs text-slate-500 font-medium">kg trong kỳ tập luyện này</span>
                    </div>
                  </div>

                  {aiAdvice && (
                    <div className="p-3 bg-white/80 rounded-xl border border-amber-100 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Lộ trình khuyến nghị:</span>
                        <span className="text-gym-accent">~{aiAdvice.estimatedWeeks} tuần ({aiAdvice.estimatedMonths} tháng)</span>
                      </div>
                      <div className="text-slate-600 font-medium">{aiAdvice.recommendation}</div>
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1 pt-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Mục tiêu calo: {aiAdvice.dailyKcal}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Chọn hình thức thanh toán:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "transfer"
                        ? "bg-blue-50/80 border-blue-600 ring-1 ring-blue-600"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="transfer"
                      checked={paymentMethod === "transfer"}
                      onChange={() => setPaymentMethod("transfer")}
                      className="text-blue-600 focus:ring-blue-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-blue-600" />
                        Quét mã QR Chuyển khoản (VietQR)
                      </div>
                      <span className="text-[11px] text-slate-400">Tự động kích hoạt ngay lập tức</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === "cash"
                        ? "bg-blue-50/80 border-blue-600 ring-1 ring-blue-600"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={() => setPaymentMethod("cash")}
                      className="text-blue-600 focus:ring-blue-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-slate-600" />
                        Thanh toán tại quầy lễ tân
                      </div>
                      <span className="text-[11px] text-slate-400">Tiền mặt hoặc quẹt thẻ POS</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Summary and Submit */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                    Tổng chi phí thanh toán ({currentDurationObj.label}):
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400">
                    {formatVND(calculatedPrice)}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span>{paymentMethod === "transfer" ? "Tiếp tục quét mã VietQR" : "Xác nhận đăng ký gói"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: QR CODE BANK TRANSFER CONFIRMATION                             */}
      {/* ========================================================================= */}
      {isQrModalOpen && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 relative my-8 text-left overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Quét mã VietQR chuyển khoản</h3>
                  <p className="text-xs text-blue-100">Kích hoạt gói tập hoàn toàn tự động</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelQrPayment}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Image and Transfer Details */}
            <div className="p-6 space-y-4 text-center">
              <div className="inline-block p-3 rounded-2xl bg-white border-2 border-slate-200 shadow-md">
                <img
                  src={qrData.vietQrUrl}
                  onError={(e) => {
                    e.currentTarget.src = qrData.backupQrUrl;
                  }}
                  alt="Mã QR Chuyển Khoản Ngân Hàng"
                  className="w-52 h-52 object-contain mx-auto"
                />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Mở ứng dụng Ngân hàng (App Banking) bất kỳ để quét mã QR và thanh toán
              </p>

              {/* Details table */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                {/* Bank Name */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ngân hàng:</span>
                  <span className="font-bold text-slate-800">{qrData.bankName}</span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 tracking-wider">
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

                {/* Account Owner */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-900">{qrData.accountName}</span>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Số tiền cần chuyển:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-blue-600 text-sm">
                      {formatVND(qrData.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(qrData.amount.toString(), "amount")}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Sao chép số tiền"
                    >
                      {copiedField === "amount" ? (
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
                    <span className="font-extrabold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded border border-blue-200 text-xs">
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
              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed text-left">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
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
