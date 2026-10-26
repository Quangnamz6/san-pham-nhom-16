import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ShieldCheck, RefreshCw, KeyRound, X, CheckCircle2, ArrowRight } from "lucide-react";

export const OtpVerificationModal = ({ isOpen, email, onClose, onSuccess }) => {
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const { verifyOtp, resendOtp } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();

  // Cooldown countdown effect
  useEffect(() => {
    let timer;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(val);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toastError("Vui lòng nhập đủ 6 chữ số mã xác thực OTP.");
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, otpCode);
      toastSuccess("Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.");
      if (onSuccess) onSuccess();
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

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    try {
      await resendOtp(email);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md p-7 sm:p-9 rounded-3xl shadow-2xl border border-slate-200 relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Shield Icon */}
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-600 to-cyan-500 items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>

        {/* Title & Description */}
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Xác Thực Mã OTP
        </h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Mã xác thực 6 chữ số đã được gửi tới địa chỉ:
          <span className="block font-bold text-slate-800 text-sm mt-0.5 break-all">
            {email}
          </span>
          <span className="block text-[11px] text-blue-600 font-semibold mt-1">
            ⏱️ Hiệu lực trong 10 phút. Vui lòng kiểm tra cả hộp thư Spam.
          </span>
        </p>

        {/* Form */}
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nhập mã 6 chữ số
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="6"
              autoFocus
              value={otpCode}
              onChange={handleOtpChange}
              placeholder="••••••"
              className="w-full py-3.5 px-4 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 rounded-2xl text-center font-mono text-2xl font-extrabold tracking-[10px] text-slate-900 placeholder-slate-300 focus:outline-none focus:bg-white transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Xác Nhận OTP & Kích Hoạt
              </>
            )}
          </button>
        </form>

        {/* Resend Cooldown */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Chưa nhận được mã?</span>
          {countdown > 0 ? (
            <span className="font-semibold text-slate-400">
              Gửi lại sau <b>{countdown}s</b>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              Gửi lại mã OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
