import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  X,
  User,
  Mail,
  Lock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  KeyRound,
} from "lucide-react";

export const RegisterModal = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const { register, verifyOtp, resendOtp } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();

  useEffect(() => {
    let timer;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || null,
        role: "member",
      });
      toastSuccess(res.message || "Đăng ký thành công! Vui lòng nhập mã OTP gửi tới email.");
      setStep("otp");
      setCountdown(60);
      setOtpCode("");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || "Đăng ký thất bại.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toastError("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(formData.email, otpCode);
      toastSuccess("Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.");
      if (onRegisterSuccess) onRegisterSuccess(formData.email);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || "Mã OTP không chính xác hoặc hết hạn.";
      toastError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      await resendOtp(formData.email);
      toastInfo("Mã OTP mới đã được gửi lại vào email của bạn.");
      setCountdown(60);
    } catch (err) {
      toastError("Không thể gửi lại mã OTP. Vui lòng thử lại sau.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md p-7 sm:p-9 rounded-3xl shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "form" ? (
          <div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Đăng Ký Hội Viên Mới</h3>
              <p className="text-xs text-slate-500 mt-1">Hệ thống Quản lý Thể hình GYM AI</p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn An"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0912 345 678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Địa chỉ Email</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-gym-accent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gym-accent hover:bg-gym-accentHover text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? "Đang gửi mã OTP qua Gmail..." : "Hoàn tất Đăng ký (Nhận mã OTP)"}
              </button>
            </form>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-gym-accent to-amber-500 items-center justify-center shadow-lg shadow-orange-500/25 mb-3">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Xác Thực Mã OTP</h3>
            <p className="text-xs text-slate-500 mt-1">
              Mã xác thực đã được gửi tới: <b>{formData.email}</b>
            </p>

            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
              <input
                type="text"
                maxLength="6"
                autoFocus
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full py-3 px-4 bg-slate-50 border-2 border-slate-300 focus:border-gym-accent rounded-xl text-center font-mono text-2xl font-extrabold tracking-[8px] text-slate-900 focus:outline-none"
              />

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 px-4 bg-gym-accent hover:bg-gym-accentHover text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all"
              >
                {loading ? "Đang xác nhận mã OTP..." : "Xác Nhận OTP & Kích Hoạt"}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              {countdown > 0 ? (
                <span>Gửi lại sau <b>{countdown}s</b></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="font-bold text-gym-accent hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Gửi lại mã OTP
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-slate-400 hover:text-slate-700"
              >
                Sửa thông tin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
