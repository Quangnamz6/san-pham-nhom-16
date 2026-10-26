import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Dumbbell, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export const HomePage = () => {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-[600px] h-[600px] bg-blue-600/15 blur-[130px] rounded-full pointer-events-none"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Nền tảng Quản lý Thể hình Thế hệ mới
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Nâng tầm phòng Gym với{" "}
            <span className="gradient-text">Trí Tuệ Nhân Tạo</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Hệ thống quản lý toàn diện tích hợp AI: Tự động hóa điểm danh, đặt lịch PT,
            theo dõi hợp đồng hội viên và phân tích giáo án luyện tập, thực đơn cá nhân hóa tức thì.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat", { detail: { open: true } }))}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
            >
              <Sparkles className="w-5 h-5" />
              Trải nghiệm Chatbot AI ngay
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-base border border-slate-700 transition-all"
            >
              Đăng nhập Hệ thống
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Tính Năng Vượt Trội</h2>
          <p className="text-slate-400 mt-2">Được thiết kế tối ưu cho cả Nhà quản lý, HLV và Hội viên</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl hover:border-cyan-500/40 transition-all bg-slate-900/60 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-5">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Trợ lý Thể hình AI</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tự động phân tích nhu cầu, tư vấn gói tập thực tế từ CSDL, lập lịch tập khoa học và tư vấn dinh dưỡng chuẩn y khoa.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:border-blue-500/40 transition-all bg-slate-900/60 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Lịch tập PT & Điểm danh</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Theo dõi lịch huấn luyện viên cá nhân trực quan, ngăn chặn trùng lịch và hỗ trợ check-in quét thẻ nhanh chóng tại quầy.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl hover:border-sky-500/40 transition-all bg-slate-900/60 border border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Quản trị & Doanh thu</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Quản lý gói tập, hợp đồng thành viên, xuất hóa đơn thanh toán minh bạch và phân quyền bảo mật 4 cấp độ (RBAC).
            </p>
          </div>
        </div>
      </section>

      {/* Stack Tech Badge */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">
          Công nghệ lõi tiêu chuẩn Enterprise
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {["FastAPI", "SQLAlchemy ORM", "SQLite / PostgreSQL", "React (Vite)", "Tailwind CSS", "OpenAI & Gemini", "JWT + RBAC"].map((tech) => (
            <span
              key={tech}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-300"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
