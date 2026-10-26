import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { hourlyPassService } from "../services/hourlyPassService";
import {
  Clock,
  Dumbbell,
  UserCheck,
  Sparkles,
  CalendarDays,
  CheckCircle2,
  QrCode,
  Copy,
  Check,
  X,
  ShieldCheck,
  Flame,
  Zap,
  Award,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  Tag,
  Ticket,
  ArrowRight,
  ExternalLink,
  MapPin,
  RefreshCw,
} from "lucide-react";

export const HourlyPass = () => {
  const { user } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const navigate = useNavigate();

  // Active Tab: 'self_practice' (Tự Tập) | 'pt_session' (Thuê PT 1:1)
  const [activeTab, setActiveTab] = useState("self_practice");

  // Options for Self-Practice
  const selfPracticeOptions = [
    {
      id: "sp_1h",
      title: "Tự Tập 1 Giờ",
      durationHours: 1,
      price: 30000,
      badge: "Tiết Kiệm",
      description: "Thích hợp cho buổi tập cardio nhanh hoặc bài tập đơn nhóm cơ.",
      highlights: ["Toàn quyền dùng máy tập", "Tủ Locker cá nhân", "Nước Detox miễn phí"],
    },
    {
      id: "sp_2h",
      title: "Tự Tập 2 Giờ",
      durationHours: 2,
      price: 50000,
      badge: "Phổ Biến Nhất",
      popular: true,
      description: "Thời gian lý tưởng để hoàn thành trọn vẹn buổi tập & giãn cơ xông hơi.",
      highlights: ["Toàn quyền dùng máy tập", "Tủ Locker thông minh", "Tắm nóng lạnh & Xông hơi", "Nước Detox miễn phí"],
    },
    {
      id: "sp_3h",
      title: "Tự Tập 3 Giờ",
      durationHours: 3,
      price: 70000,
      badge: "Chuyên Sâu",
      description: "Thoải mái tập nặng, superset và hồi phục thể lực không lo hết giờ.",
      highlights: ["Full máy tạ Olympic", "Tủ Locker thông minh", "Tắm nóng lạnh & Xông hơi", "Nước Detox & Khăn tập"],
    },
    {
      id: "sp_day",
      title: "Vé Ngày (Day Pass)",
      durationHours: 24,
      price: 80000,
      badge: "Ưu Đãi 1 Ngày",
      special: true,
      description: "Tự do ra vào phòng tập cả ngày (06:00 - 22:00) không giới hạn số lần.",
      highlights: ["Ra vào tự do cả ngày", "Tủ Locker VIP", "Xông hơi đá muối & Thảo dược", "Nước Detox & Khăn tập VIP"],
    },
  ];

  // Options for PT Session
  const ptSessionOptions = [
    {
      id: "pt_1h",
      title: "Thuê PT 1 Giờ (1:1)",
      durationHours: 1,
      price: 180000,
      badge: "Kèm Riêng 1:1",
      description: "PT đồng hành sửa form bài tập (Squat, Deadlift), kiểm tra tư thế và đẩy tạ an toàn.",
      highlights: ["HLV kèm riêng 1:1 suốt 60 phút", "Chỉnh sửa kỹ thuật chuẩn form", "Đo InBody phân tích cơ mỡ", "Bao gồm vé vào phòng tập"],
    },
    {
      id: "pt_2h",
      title: "Thuê PT 2 Giờ (1:1)",
      durationHours: 2,
      price: 320000,
      badge: "Tiết Kiệm 40.000đ",
      popular: true,
      description: "Buổi tập chuyên sâu toàn diện: Khởi động khớp, bài chính cường độ cao & Giãn cơ PNF.",
      highlights: ["HLV kèm riêng 1:1 suốt 120 phút", "Giáo án cá nhân hóa theo mục tiêu", "Kéo giãn cơ PNF chống đau mỏi", "Đo InBody & Tư vấn dinh dưỡng"],
    },
  ];

  // State for user selections
  const [selectedSelfOption, setSelectedSelfOption] = useState(selfPracticeOptions[1]);
  const [selectedPtOption, setSelectedPtOption] = useState(ptSessionOptions[0]);

  // Selected date & time
  const todayStr = new Date().toISOString().split("T")[0];
  const [bookingDate, setBookingDate] = useState(todayStr);
  const [timeSlot, setTimeSlot] = useState("08:00 - 10:00");
  const [customTime, setCustomTime] = useState("");
  const [notes, setNotes] = useState("");

  // Trainers state
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

  // My hourly bookings history state
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // VietQR Modal states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Success Ticket Modal state
  const [createdTicket, setCreatedTicket] = useState(null);

  // Time Slot presets
  const timeSlotPresets = [
    { label: "06:00 - 08:00", desc: "Sáng sớm vắng thoáng" },
    { label: "08:00 - 10:00", desc: "Buổi sáng năng lượng" },
    { label: "11:30 - 13:30", desc: "Buổi trưa nghỉ ngơi" },
    { label: "15:00 - 17:00", desc: "Chiều mát tập luyện" },
    { label: "17:30 - 19:30", desc: "Khung giờ vàng sau giờ làm" },
    { label: "19:30 - 21:30", desc: "Buổi tối thư giãn" },
  ];

  // Load trainers and recent bookings
  useEffect(() => {
    loadTrainers();
    loadMyBookings();
  }, [user]);

  const loadTrainers = async () => {
    setLoadingTrainers(true);
    try {
      const data = await hourlyPassService.getTrainers();
      if (data && data.length > 0) {
        setTrainers(data);
        setSelectedTrainer(data[0]);
      } else {
        // Fallback realistic trainers if DB has none
        const fallback = [
          {
            id: 1,
            user: { full_name: "Trần Văn Huấn Luyện" },
            specialization: "Tăng cơ, Giảm mỡ nhanh, Chỉnh phom Compound",
            bio: "HLV 6 năm kinh nghiệm, Chứng chỉ quốc tế NASM & Thể hình đỉnh cao",
            rating: "5.0",
          },
          {
            id: 2,
            user: { full_name: "Lê Văn Thể Hình" },
            specialization: "Powerlifting, Squat-Bench-Deadlift, Độ dẻo dai",
            bio: "Kiện tướng thể hình quốc gia, chuyên sâu siết cơ & tăng sức mạnh",
            rating: "4.9",
          },
          {
            id: 3,
            user: { full_name: "Nguyễn Thị Thảo Vy" },
            specialization: "Pilates, Săn chắc eo thon, Giảm mỡ toàn thân",
            bio: "Chuyên gia chỉnh phom dáng vóc nữ, phục hồi võng lưng & đau mỏi",
            rating: "5.0",
          },
        ];
        setTrainers(fallback);
        setSelectedTrainer(fallback[0]);
      }
    } catch (err) {
      console.warn("Could not load trainers, using defaults", err);
    } finally {
      setLoadingTrainers(false);
    }
  };

  const loadMyBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await hourlyPassService.getMyBookings();
      setMyBookings(data || []);
    } catch (err) {
      console.warn("Could not load my bookings", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Helper format currency
  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  // Current selected package details
  const currentPackage = useMemo(() => {
    if (activeTab === "self_practice") {
      return {
        type: "self_practice",
        title: selectedSelfOption.title,
        durationHours: selectedSelfOption.durationHours,
        price: selectedSelfOption.price,
        trainer: null,
      };
    } else {
      return {
        type: "pt_session",
        title: selectedPtOption.title,
        durationHours: selectedPtOption.durationHours,
        price: selectedPtOption.price,
        trainer: selectedTrainer,
      };
    }
  }, [activeTab, selectedSelfOption, selectedPtOption, selectedTrainer]);

  // Copy handler
  const handleCopy = (text, fieldName) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toastInfo(`Đã sao chép: ${text}`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Trigger Checkout VietQR Modal
  const handleProceedToPayment = () => {
    if (!bookingDate) {
      toastError("Vui lòng chọn ngày check-in dự kiến!");
      return;
    }

    const effectiveTimeSlot = customTime.trim() || timeSlot;
    if (!effectiveTimeSlot) {
      toastError("Vui lòng chọn hoặc nhập khung giờ tập!");
      return;
    }

    if (activeTab === "pt_session" && !selectedTrainer) {
      toastError("Vui lòng chọn Huấn luyện viên cá nhân (PT)!");
      return;
    }

    const rawUserCode =
      user?.phone ||
      user?.full_name?.replace(/[^a-zA-Z0-9]/g, "") ||
      user?.id ||
      "HOIVIEN";
    const transferContent = `GYMAI VEGIO ${rawUserCode}`.toUpperCase();

    const vietQrUrl = `https://img.vietqr.io/image/MB-18082006999-compact2.png?amount=${currentPackage.price}&addInfo=${encodeURIComponent(
      transferContent
    )}&accountName=TA%20QUANG%20NAM`;

    const backupQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      `GymAI_Hourly_${currentPackage.price}_${transferContent}`
    )}`;

    setQrData({
      bankName: "MB Bank (Ngân Hàng TMCP Quân Đội)",
      accountNumber: "18082006999",
      accountName: "TA QUANG NAM",
      amount: currentPackage.price,
      content: transferContent,
      vietQrUrl,
      backupQrUrl,
      effectiveTimeSlot,
    });

    setIsQrModalOpen(true);
  };

  // Confirm VietQR Payment & Save to Backend
  const handleConfirmPayment = async () => {
    if (!qrData) return;
    setIsSubmittingBooking(true);

    try {
      const payload = {
        booking_type: currentPackage.type,
        package_title: currentPackage.title,
        trainer_id: activeTab === "pt_session" && selectedTrainer ? selectedTrainer.id : null,
        booking_date: bookingDate,
        time_slot: qrData.effectiveTimeSlot,
        duration_hours: currentPackage.durationHours,
        price: currentPackage.price,
        payment_method: "vietqr_transfer",
        transaction_code: `QR-MB-${Date.now()}`,
        notes: notes || undefined,
      };

      const result = await hourlyPassService.createBooking(payload);

      toastSuccess(`🎉 Đặt vé tập thành công! Mã vé: ${result.ticket_code || "VP-SUCCESS"}`);
      setIsQrModalOpen(false);
      setCreatedTicket(result);
      await loadMyBookings();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Không thể xác nhận đặt vé. Vui lòng thử lại hoặc liên hệ hỗ trợ.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Ocean Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-500 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/30">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Dịch Vụ Mới: Tập Linh Hoạt Không Ràng Buộc Hợp Đồng</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Vé Tập Linh Hoạt & Thuê PT Theo Giờ
          </h1>

          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Tự do dùng trọn vẹn dàn máy tập Olympic chuẩn quốc tế hoặc thuê Huấn luyện viên 1:1 theo từng giờ.
            Thanh toán VietQR tiện lợi, nhận ngay Mã vé điện tử để check-in tức thì tại phòng tập!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-semibold text-blue-100">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Mã QR Check-in tự động
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Miễn phí Locker & Xông hơi
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> Đồng bộ trực tiếp Lịch tập
            </span>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-12 bottom-6 opacity-20 hidden lg:block pointer-events-none">
          <Clock className="w-44 h-44 text-white" />
        </div>
      </div>

      {/* Main Tab Navigation: 2 Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TAB OPTION 1: TỰ TẬP THEO GIỜ */}
        <button
          type="button"
          onClick={() => setActiveTab("self_practice")}
          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex items-start gap-4 ${
            activeTab === "self_practice"
              ? "bg-white border-blue-600 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20"
              : "bg-white/80 hover:bg-white border-slate-200 hover:border-blue-300 shadow-xs"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform ${
              activeTab === "self_practice"
                ? "bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/30 scale-105"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            <Dumbbell className="w-6 h-6" />
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                OPTION 1
              </span>
              {activeTab === "self_practice" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  Đang chọn
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Tự Tập Theo Giờ (Self-Practice)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tự do dùng hệ thống máy móc, tạ tập, phòng xông hơi và toàn bộ tiện ích phòng gym.
            </p>
            <div className="pt-1.5 flex items-center gap-2 text-xs font-bold text-blue-600">
              <span>Từ 30.000đ / Buổi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

        {/* TAB OPTION 2: THUÊ PT THEO GIỜ */}
        <button
          type="button"
          onClick={() => setActiveTab("pt_session")}
          className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden flex items-start gap-4 ${
            activeTab === "pt_session"
              ? "bg-white border-blue-600 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20"
              : "bg-white/80 hover:bg-white border-slate-200 hover:border-blue-300 shadow-xs"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform ${
              activeTab === "pt_session"
                ? "bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-md shadow-cyan-500/30 scale-105"
                : "bg-cyan-50 text-cyan-600"
            }`}
          >
            <UserCheck className="w-6 h-6" />
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-700">
                OPTION 2
              </span>
              {activeTab === "pt_session" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                  Đang chọn
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Thuê PT Theo Giờ (1:1 PT Session)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Huấn luyện viên cá nhân chuyên nghiệp đồng hành 1:1, chỉnh sửa kỹ thuật và tối ưu bài tập.
            </p>
            <div className="pt-1.5 flex items-center gap-2 text-xs font-bold text-cyan-700">
              <span>Từ 180.000đ / Giờ (Bao gồm vé tập)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
      </div>

      {/* Main Content Layout: Configuration (Left) + Order Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Options Configuration */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: CHỌN GÓI VÉ / SỐ GIỜ */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                {activeTab === "self_practice" ? "1. Chọn Thời Lượng Tự Tập" : "1. Chọn Thời Lượng Kèm PT (1:1)"}
              </h3>
              <span className="text-xs text-slate-400">Chọn 1 trong các mức vé dưới đây</span>
            </div>

            {activeTab === "self_practice" ? (
              /* Self Practice Duration Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selfPracticeOptions.map((opt) => {
                  const isSelected = selectedSelfOption.id === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedSelfOption(opt)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-600 shadow-sm"
                          : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50"
                      }`}
                    >
                      {opt.badge && (
                        <span
                          className={`absolute top-3 right-3 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            opt.popular
                              ? "bg-blue-600 text-white"
                              : opt.special
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}

                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        {opt.title}
                      </h4>
                      <div className="text-lg font-black text-blue-600 mt-1">
                        {formatVND(opt.price)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {opt.description}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1">
                        {opt.highlights.map((hl, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* PT Duration Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ptSessionOptions.map((opt) => {
                  const isSelected = selectedPtOption.id === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedPtOption(opt)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                        isSelected
                          ? "bg-cyan-50/80 border-cyan-600 shadow-sm"
                          : "bg-white border-slate-200 hover:border-cyan-300 hover:bg-slate-50/50"
                      }`}
                    >
                      {opt.badge && (
                        <span
                          className={`absolute top-3 right-3 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            opt.popular
                              ? "bg-cyan-600 text-white"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}

                      <h4 className="font-extrabold text-slate-900 text-sm">{opt.title}</h4>
                      <div className="text-lg font-black text-cyan-700 mt-1">
                        {formatVND(opt.price)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {opt.description}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 space-y-1">
                        {opt.highlights.map((hl, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Check className="w-3 h-3 text-cyan-600 flex-shrink-0" />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2 (ONLY FOR PT): CHỌN HUẤN LUYỆN VIÊN (PT) */}
          {activeTab === "pt_session" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-600" />
                  2. Chọn Huấn Luyện Viên Đồng Hành (1:1)
                </h3>
                <span className="text-xs text-slate-400">Danh sách HLV trực tại cơ sở</span>
              </div>

              {loadingTrainers ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {trainers.map((tr) => {
                    const isSelected = selectedTrainer?.id === tr.id;
                    const trainerName = tr.user?.full_name || `HLV #${tr.id}`;
                    const initial = trainerName.charAt(0).toUpperCase();

                    return (
                      <div
                        key={tr.id}
                        onClick={() => setSelectedTrainer(tr)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative flex items-start gap-3.5 ${
                          isSelected
                            ? "bg-cyan-50/70 border-cyan-600 shadow-sm ring-1 ring-cyan-500/30"
                            : "bg-white border-slate-200 hover:border-cyan-300 hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-extrabold text-base flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/20">
                          {initial}
                        </div>

                        {/* Details */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                              {trainerName}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              ★ 5.0
                            </span>
                          </div>

                          <div className="text-[11px] font-semibold text-cyan-800 line-clamp-1">
                            🎯 {tr.specialization || tr.specialty || "Tăng cơ, Giảm mỡ, Phục hồi"}
                          </div>

                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            {tr.bio || "HLV giàu kinh nghiệm, tận tâm hướng dẫn từng chi tiết động tác."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CHỌN NGÀY & KHUNG GIỜ CHECK-IN */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                {activeTab === "self_practice" ? "2. Chọn Ngày & Khung Giờ Check-in" : "3. Chọn Ngày & Giờ Hẹn Cùng PT"}
              </h3>
              <span className="text-xs text-slate-400">Chủ động sắp xếp thời gian</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ngày Check-in / Tập Luyện
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={todayStr}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:bg-white focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* Time slot input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Khung giờ dự kiến
                </label>
                <input
                  type="text"
                  value={customTime || timeSlot}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="VD: 08:00 - 10:00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            {/* Quick time slot presets */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Hoặc chọn nhanh khung giờ phổ biến:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeSlotPresets.map((slot, i) => {
                  const isCurrent = timeSlot === slot.label && !customTime;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setTimeSlot(slot.label);
                        setCustomTime("");
                      }}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        isCurrent
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm font-bold"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="text-xs font-semibold">{slot.label}</div>
                      <div className={`text-[10px] truncate ${isCurrent ? "text-blue-100" : "text-slate-400"}`}>
                        {slot.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ghi chú mục tiêu buổi tập (Tùy chọn)
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  activeTab === "self_practice"
                    ? "VD: Buổi tập ngực & tay sau, test máy tạ mới..."
                    : "VD: Cần HLV chỉnh kỹ thuật Deadlift và Squat tránh đau thắt lưng..."
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition-all"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Sticky Summary & Checkout Card */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-600" />
                Thông Tin Vé Tập
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Ocean Flex Pass
              </span>
            </div>

            {/* Selected Summary Items */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Hình thức vé:</span>
                <span className="font-bold text-slate-900">
                  {activeTab === "self_practice" ? "Tự Tập Theo Giờ" : "Thuê PT Theo Giờ (1:1)"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Gói thời lượng:</span>
                <span className="font-bold text-blue-600">{currentPackage.title}</span>
              </div>

              {activeTab === "pt_session" && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Huấn luyện viên:</span>
                  <span className="font-bold text-cyan-700">
                    {selectedTrainer?.user?.full_name || "Chưa chọn"}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngày tập:</span>
                <span className="font-bold text-slate-900">{bookingDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Khung giờ:</span>
                <span className="font-bold text-slate-900">
                  {customTime.trim() || timeSlot}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Địa điểm:</span>
                <span className="font-semibold text-slate-700 text-right flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500 inline" /> Gym AI Ocean Club
                </span>
              </div>
            </div>

            {/* Included Perks */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800 block text-xs">Đặc quyền kèm theo vé:</span>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Không giới hạn dàn máy tập Olympic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Tủ đồ Locker thông minh an toàn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Tắm nước nóng & Xông hơi phục hồi</span>
              </div>
            </div>

            {/* Total Price Section */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Tổng tiền thanh toán:
                </span>
                <span className="text-2xl font-black text-blue-600">
                  {formatVND(currentPackage.price)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Đã bao gồm VAT & phí dịch vụ phòng tập
              </span>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleProceedToPayment}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <QrCode className="w-4 h-4" />
              <span>Xác Nhận & Thanh Toán VietQR</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chuyển khoản an toàn 100% qua VietQR MB Bank</span>
            </div>
          </div>

          {/* Quick link to workout schedules */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-slate-600 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block">Đã có lịch tập trước đó?</span>
              <p className="text-[11px] text-slate-500">Theo dõi danh sách buổi tập & điểm danh</p>
            </div>
            <Link
              to="/schedules"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <span>Xem lịch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION: LỊCH SỬ VÉ TẬP LINH HOẠT CỦA BẠN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-blue-600" />
              Vé Tập Linh Hoạt Của Bạn ({myBookings.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách các vé tập theo giờ và lịch thuê PT đã đặt trong hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={loadMyBookings}
            disabled={loadingBookings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {loadingBookings ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : myBookings.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
            <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <span className="font-bold text-slate-700 text-xs block">Bạn chưa có vé tập linh hoạt nào</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hãy chọn gói tự tập hoặc thuê PT ở phía trên để đặt buổi tập đầu tiên!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 hover:border-blue-300 hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {b.ticket_code || `VP-${b.id}`}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-1.5 line-clamp-1">
                      {b.package_title}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {b.status === "confirmed" ? "Đã xác nhận" : b.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngày: <strong>{b.booking_date}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Giờ: <strong>{b.time_slot}</strong> ({b.duration_hours} giờ)</span>
                  </div>
                  {b.trainer && (
                    <div className="flex items-center gap-1.5 text-cyan-800">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
                      <span>HLV: <strong>{b.trainer.user?.full_name || "Huấn luyện viên"}</strong></span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="font-black text-blue-600">{formatVND(b.price)}</span>
                  <button
                    type="button"
                    onClick={() => setCreatedTicket(b)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    <span>Xem mã vé</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: THANH TOÁN VIETQR */}
      {isQrModalOpen && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-500 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Quét Mã VietQR Chuyển Khoản</h3>
                  <p className="text-xs text-blue-100">Xác nhận đặt vé tập theo giờ tức thì</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Content */}
            <div className="p-6 space-y-4 text-center max-h-[75vh] overflow-y-auto">
              {/* QR Image Box */}
              <div className="inline-block p-3.5 rounded-2xl bg-white border-2 border-slate-200 shadow-md">
                <img
                  src={qrData.vietQrUrl}
                  onError={(e) => {
                    e.currentTarget.src = qrData.backupQrUrl;
                  }}
                  alt="Mã QR Chuyển Khoản Ngân Hàng MB Bank"
                  className="w-52 h-52 object-contain mx-auto"
                />
              </div>

              <p className="text-xs text-slate-500 font-medium">
                Mở ứng dụng Ngân hàng (App Banking) bất kỳ để quét mã QR và thanh toán
              </p>

              {/* Transfer Details Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2.5 text-xs">
                {/* Bank */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ngân hàng thụ hưởng:</span>
                  <span className="font-bold text-slate-900">{qrData.bankName}</span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm tracking-wider">
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
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Số tiền cần chuyển:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-600 text-base">
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

                {/* Content */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-900 bg-blue-100/90 px-2.5 py-0.5 rounded border border-blue-200 text-xs">
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

              {/* Notice */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 text-left leading-relaxed">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Sau khi quét mã QR và hoàn tất chuyển tiền trong ứng dụng ngân hàng, vui lòng bấm nút{" "}
                  <strong>"Tôi đã chuyển khoản thành công"</strong> bên dưới để lưu lịch hẹn và nhận Mã vé điện tử.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                disabled={isSubmittingBooking}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
              >
                Hủy giao dịch
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isSubmittingBooking}
                className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingBooking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xác thực và lưu lịch tập...</span>
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

      {/* MODAL 2: VÉ ĐIỆN TỬ CHECK-IN THÀNH CÔNG */}
      {createdTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 p-5 text-white text-center relative">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-extrabold text-lg">Đặt Vé Thành Công!</h3>
              <p className="text-xs text-emerald-100">Vé tập đã được đồng bộ vào Lịch tập của bạn</p>
              <button
                type="button"
                onClick={() => setCreatedTicket(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Card Details */}
            <div className="p-6 space-y-4 text-center">
              {/* Ticket Code Box */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border-2 border-dashed border-blue-300 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                  MÃ VÉ ĐIỆN TỬ (TICKET CODE)
                </span>
                <div className="text-2xl font-black text-blue-700 tracking-wider">
                  {createdTicket.ticket_code || "VP-PASS"}
                </div>
                <p className="text-[11px] text-slate-500">
                  Xuất trình mã này hoặc quét QR tại cổng kiểm soát lễ tân để vào phòng tập.
                </p>
              </div>

              {/* Simulated QR Code for Ticket */}
              <div className="inline-block p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `GYMAI_PASS_${createdTicket.ticket_code || createdTicket.id}`
                  )}`}
                  alt="QR Check-in"
                  className="w-32 h-32 mx-auto"
                />
              </div>

              {/* Information list */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gói vé:</span>
                  <span className="font-bold text-slate-900">{createdTicket.package_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày tập:</span>
                  <span className="font-bold text-slate-900">{createdTicket.booking_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khung giờ:</span>
                  <span className="font-bold text-slate-900">{createdTicket.time_slot}</span>
                </div>
                {createdTicket.trainer && (
                  <div className="flex justify-between text-cyan-800">
                    <span className="text-slate-500">HLV cá nhân:</span>
                    <span className="font-bold">{createdTicket.trainer.user?.full_name || "Huấn luyện viên"}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Thanh toán:</span>
                  <span className="font-black text-blue-600">{formatVND(createdTicket.price)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setCreatedTicket(null)}
                className="w-full sm:w-1/2 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedTicket(null);
                  navigate("/schedules");
                }}
                className="w-full sm:w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Xem Trong Lịch Tập</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HourlyPass;
