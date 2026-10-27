import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { paymentService } from "../services/paymentService";
import { useToast } from "../context/ToastContext";
import {
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowLeft,
  Search,
  Filter,
  FileText,
} from "lucide-react";

export const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState("all");
  const { toastError } = useToast();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentService.getPayments();
      setPayments(data || []);
    } catch (err) {
      toastError("Không thể tải danh sách hóa đơn thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  const filteredPayments = payments.filter((p) => {
    if (filterMethod === "all") return true;
    return p.payment_method?.toLowerCase() === filterMethod.toLowerCase();
  });

  const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const getMethodBadge = (method) => {
    switch (method?.toLowerCase()) {
      case "transfer":
      case "bank_transfer":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">Chuyển khoản</span>;
      case "card":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">Thẻ POS</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">Tiền mặt</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-7 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-xs font-bold text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <CreditCard className="w-5 h-5" />
            </div>
            Báo Cáo Doanh Thu & Hóa Đơn
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
            Theo dõi dòng tiền, lịch sử thu phí gói tập và thanh toán hội viên theo thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPayments}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all flex items-center gap-2 text-xs font-bold shadow-sm hover:border-cyan-400 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Doanh Thu
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-3 truncate tracking-tight">
            {formatVND(totalRevenue)}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Tích lũy toàn bộ giao dịch thành công</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(0,200,255,0.2)] hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Số Giao Dịch
            </span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight">
            {payments.length} <span className="text-sm font-semibold text-slate-400">hóa đơn</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Bao gồm đăng ký mới & gia hạn gói tập</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-2xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Giá Trị Đơn Trung Bình
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-cyan-300 flex items-center justify-center border border-blue-500/30 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-300 mt-3 truncate tracking-tight">
            {formatVND(payments.length ? totalRevenue / payments.length : 0)}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Trung bình trên mỗi hợp đồng hội viên</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mr-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Lọc phương thức:</span>
          </div>
          {["all", "cash", "transfer", "card"].map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(m)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterMethod === m
                  ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {m === "all" ? "Tất cả" : m === "cash" ? "Tiền mặt" : m === "transfer" ? "Chuyển khoản" : "Thẻ POS"}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400 font-semibold bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
          Hiển thị <b className="text-cyan-300">{filteredPayments.length}</b> giao dịch
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-2xl animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3 border border-slate-800">
              <CreditCard className="w-8 h-8 text-slate-600" />
            </div>
            <p className="font-bold text-white text-sm">Chưa có giao dịch thanh toán nào phù hợp.</p>
            <p className="text-slate-400 mt-1">Các hóa đơn sau khi hoàn tất sẽ tự động xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800">
                <tr className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-5">Mã Giao Dịch</th>
                  <th className="py-4 px-5">Hợp Đồng #</th>
                  <th className="py-4 px-5">Số Tiền</th>
                  <th className="py-4 px-5">Phương Thức</th>
                  <th className="py-4 px-5">Ngày Thanh Toán</th>
                  <th className="py-4 px-5 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold text-white">
                      <span className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-cyan-400">
                        #{p.id.toString().padStart(5, "0")}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-300 font-semibold">
                      HĐ-MB-{p.membership_id}
                    </td>
                    <td className="py-4 px-5 font-black text-emerald-400 text-sm tracking-tight">
                      {formatVND(p.amount)}
                    </td>
                    <td className="py-4 px-5">
                      {getMethodBadge(p.payment_method)}
                    </td>
                    <td className="py-4 px-5 text-slate-400 font-medium">
                      {p.payment_date}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Đã thanh toán
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
