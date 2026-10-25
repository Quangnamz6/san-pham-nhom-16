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
        return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">Chuyển khoản</span>;
      case "card":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-600 border border-purple-200">Thẻ POS</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Tiền mặt</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-gym-accent flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-gym-accent" />
            Báo Cáo Doanh Thu & Hóa Đơn
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Theo dõi dòng tiền, lịch sử thu phí gói tập và thanh toán hội viên theo thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPayments}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-gym-accent" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Doanh Thu Thu Được
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2 truncate">
            {formatVND(totalRevenue)}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Tích lũy toàn bộ giao dịch thành công</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng Số Giao Dịch
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {payments.length} hóa đơn
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Bao gồm đăng ký mới & gia hạn gói tập</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Giá Trị Đơn Trung Bình
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 mt-2 truncate">
            {formatVND(payments.length ? totalRevenue / payments.length : 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Trung bình trên mỗi hợp đồng hội viên</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Lọc phương thức:</span>
          {["all", "cash", "transfer", "card"].map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMethod === m
                  ? "bg-gym-accent text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {m === "all" ? "Tất cả" : m === "cash" ? "Tiền mặt" : m === "transfer" ? "Chuyển khoản" : "Thẻ"}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <b>{filteredPayments.length}</b> giao dịch
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-medium">Chưa có giao dịch thanh toán nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã Giao Dịch</th>
                  <th className="py-3.5 px-4">Hợp Đồng #</th>
                  <th className="py-3.5 px-4">Số Tiền</th>
                  <th className="py-3.5 px-4">Phương Thức</th>
                  <th className="py-3.5 px-4">Ngày Thanh Toán</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{p.id.toString().padStart(5, "0")}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      HĐ-MB-{p.membership_id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 text-sm">
                      {formatVND(p.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getMethodBadge(p.payment_method)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {p.payment_date}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
