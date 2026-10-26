import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Dumbbell,
  Lock,
  Mail,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

export const LoginPage = () => {
  // mode: "login" | "register" | "verify_otp"
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const { login, register, verifyOtp, resendOtp } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const navigate = useNavigate();

  // Cooldown countdown effect for resend OTP
  useEffect(() => {
    let timer;
    if (mode === "verify_otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, countdown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(val);
  };

  // Submit Login or Register
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        // Luồng Đăng ký tài khoản: Gửi request đăng ký và kích hoạt gửi mã OTP qua Gmail
        const res = await register({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: "member",
        });

        toastSuccess(
          res.message || "Đăng ký thành công! Vui lòng kiểm tra Gmail để nhận mã OTP."
        );

        // LẬP TỨC chuyển giao diện sang Form nhập OTP 6 chữ số
        setOtpEmail(formData.email);
        setOtpCode("");
        setCountdown(60);
        setMode("verify_otp");
      } else {
        // Luồng Đăng nhập
        await login(formData.email, formData.password);
        toastSuccess("Đăng nhập thành công!");
        navigate("/dashboard");
      }
    } catch (err) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Thao tác không thành công. Vui lòng thử lại.";

      // Nếu tài khoản chưa xác thực OTP, chuyển ngay sang màn hình nhập OTP để kích hoạt
      if (status === 403 && typeof msg === "string" && msg.includes("chưa được xác thực email")) {
        toastError(msg);
        setOtpEmail(formData.email);
        setOtpCode("");
        setCountdown(60);
        setMode("verify_otp");
      } else {
        toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toastError("Vui lòng nhập đủ 6 chữ số mã xác thực OTP.");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(otpEmail, otpCode);
      toastSuccess("Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.");
      // Chuyển hướng về trang Đăng nhập
      setMode("login");
      setFormData((prev) => ({ ...prev, email: otpEmail }));
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Mã xác thực OTP không chính xác hoặc đã hết hạn.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    try {
      await resendOtp(otpEmail);
      toastInfo("Mã xác thực OTP mới đã được gửi lại vào email của bạn.");
      setCountdown(60);
      setOtpCode("");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Không thể gửi lại mã OTP. Vui lòng thử lại sau.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80')] bg-cover bg-center">
      {/* Dark Overlay with gentle blur */}
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]"></div>

      {/* Main Login / Register / OTP Card */}
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/40 z-10 transition-all">
        {/* ========================================================================= */}
        {/* MODE 1 & 2: LOGIN & REGISTER FORMS */}
        {/* ========================================================================= */}
        {mode !== "verify_otp" ? (
          <>
            {/* Header Icon & Brand */}
            <div className="text-center mb-7">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-600 to-cyan-500 items-center justify-center shadow-xl shadow-blue-500/30 mb-3.5 transform hover:rotate-6 transition-transform">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {mode === "register" ? "Đăng ký Hội viên mới" : "Đăng nhập Hệ thống"}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Hệ thống Quản lý Thể hình Thông minh GYM AI
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Họ và tên
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        name="full_name"
                        required
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn An"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-gym-accent focus:ring-2 focus:ring-gym-accent/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Số điện thoại
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="0912 345 678"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-gym-accent focus:ring-2 focus:ring-gym-accent/20 transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-gym-accent focus:ring-2 focus:ring-gym-accent/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:bg-white focus:border-gym-accent focus:ring-2 focus:ring-gym-accent/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{mode === "register" ? "Đang gửi mã OTP qua Gmail..." : "Đang đăng nhập..."}</span>
                  </>
                ) : mode === "register" ? (
                  "Hoàn tất Đăng ký (Nhận mã OTP)"
                ) : (
                  "Đăng nhập Hệ thống"
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 pt-5 border-t border-slate-200/80 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "register" ? "login" : "register")}
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
              >
                {mode === "register"
                  ? "Đã có tài khoản? Quay lại Đăng nhập"
                  : "Chưa có tài khoản? Đăng ký thành viên mới"}
              </button>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* MODE 3: DIRECT OTP VERIFICATION FORM (HIỂN THỊ LẬP TỨC SAU KHI ĐĂNG KÝ)  */
          /* ========================================================================= */
          <div className="text-center animate-in fade-in duration-300">
            {/* Header Icon */}
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-600 to-cyan-500 items-center justify-center shadow-xl shadow-blue-500/30 mb-3.5">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Xác Thực Mã OTP
            </h2>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Mã xác thực 6 chữ số đã được gửi tới địa chỉ:
              <span className="block font-bold text-slate-800 text-sm mt-0.5 break-all">
                {otpEmail}
              </span>
              <span className="block text-[11px] text-blue-600 font-semibold mt-1">
                ⏱️ Mã có hiệu lực trong 10 phút. Vui lòng kiểm tra cả thư mục Spam.
              </span>
            </p>

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nhập mã OTP (6 chữ số)
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    autoFocus
                    required
                    value={otpCode}
                    onChange={handleOtpChange}
                    placeholder="123456"
                    className="w-full py-3.5 pl-12 pr-4 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white rounded-2xl text-center font-mono text-2xl font-extrabold tracking-[8px] text-slate-900 placeholder-slate-300 focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xác nhận mã OTP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Xác Nhận OTP & Kích Hoạt
                  </>
                )}
              </button>
            </form>

            {/* Resend OTP & Back */}
            <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Chưa nhận được mã?</span>
                {countdown > 0 ? (
                  <span className="font-semibold text-slate-400">
                    Gửi lại sau <b>{countdown}s</b>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Đang gửi lại..." : "Gửi lại mã OTP"}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 mt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại màn hình Đăng nhập
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
