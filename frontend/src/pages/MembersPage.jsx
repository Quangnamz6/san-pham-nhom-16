import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { memberService } from "../services/memberService";
import { packageService } from "../services/packageService";
import { useToast } from "../context/ToastContext";
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Edit2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
} from "lucide-react";

export const MembersPage = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "all";

  const [members, setMembers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState(null);

  // Form states
  const [memberForm, setMemberForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "member123",
  });

  const [renewForm, setRenewForm] = useState({
    package_id: "",
    payment_method: "cash",
  });

  const [submitting, setSubmitting] = useState(false);

  const { toastSuccess, toastError } = useToast();

  useEffect(() => {
    loadMembers();
    loadPackages();
  }, [statusFilter]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await memberService.getMembers({
        search,
        status: statusFilter,
      });
      setMembers(data);
    } catch (err) {
      toastError("Lỗi khi tải danh sách hội viên.");
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const pkgs = await packageService.getPackages();
      setPackages(pkgs);
      if (pkgs.length > 0) {
        setRenewForm((prev) => ({ ...prev, package_id: pkgs[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMembers();
  };

  // Open Add/Edit Modal
  const openMemberModal = (member = null) => {
    if (member) {
      setEditingMember(member);
      setMemberForm({
        full_name: member.full_name,
        email: member.email,
        phone: member.phone || "",
        password: "",
      });
    } else {
      setEditingMember(null);
      setMemberForm({
        full_name: "",
        email: "",
        phone: "",
        password: "member123",
      });
    }
    setIsMemberModalOpen(true);
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMember) {
        await memberService.updateMember(editingMember.id, {
          full_name: memberForm.full_name,
          email: memberForm.email,
          phone: memberForm.phone || null,
          password: memberForm.password || undefined,
        });
        toastSuccess("Cập nhật thông tin hội viên thành công!");
      } else {
        await memberService.createMember({
          full_name: memberForm.full_name,
          email: memberForm.email,
          phone: memberForm.phone || null,
          password: memberForm.password || "member123",
          role: "member",
        });
        toastSuccess("Thêm hội viên mới thành công!");
      }
      setIsMemberModalOpen(false);
      loadMembers();
    } catch (err) {
      toastError(err.response?.data?.message || err.response?.data?.detail || "Thao tác thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Renew Modal
  const openRenewModal = (member) => {
    setSelectedMemberForRenew(member);
    if (packages.length > 0) {
      setRenewForm({
        package_id: packages[0].id,
        payment_method: "cash",
      });
    }
    setIsRenewModalOpen(true);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await packageService.renewPackage({
        user_id: selectedMemberForRenew.id,
        package_id: Number(renewForm.package_id),
        payment_method: renewForm.payment_method,
      });
      toastSuccess(`Gia hạn gói tập cho hội viên ${selectedMemberForRenew.full_name} thành công!`);
      setIsRenewModalOpen(false);
      loadMembers();
    } catch (err) {
      toastError(err.response?.data?.message || err.response?.data?.detail || "Gia hạn thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-7 rounded-3xl border border-slate-800/80 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
              Quản Trị Khách Hàng
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              VIP DIRECTORY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-cyan-400" />
            <span>Quản Lý Hồ Sơ Hội Viên</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Tra cứu hồ sơ, theo dõi tình trạng gói tập và gia hạn hợp đồng trực tuyến.
          </p>
        </div>

        <button
          onClick={() => openMemberModal(null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl gradient-btn-primary hover:opacity-95 text-white text-xs font-black shadow-lg shadow-cyan-500/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Đăng ký Hội viên mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 backdrop-blur-2xl p-4 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Tên, Số điện thoại hoặc Email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-all font-medium"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Lọc:
          </span>
          {[
            { label: "Tất cả", value: "all" },
            { label: "Đang hiệu lực", value: "active" },
            { label: "Đã hết hạn", value: "expired" },
            { label: "Chưa có gói", value: "none" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex-shrink-0 cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded-2xl animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-medium">Không tìm thấy hội viên nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800">
                <tr className="text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Hội Viên</th>
                  <th className="py-3.5 px-4">Liên Hệ</th>
                  <th className="py-3.5 px-4">Gói Tập Hiện Tại</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Điểm Danh</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {members.map((m) => {
                  const mem = m.active_membership;
                  const isActive = mem && mem.status === "active";

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 text-xs">
                            {m.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white">{m.full_name}</div>
                            <div className="text-[11px] text-slate-400">ID: #{m.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{m.phone || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{m.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {mem ? (
                          <div>
                            <div className="font-bold text-cyan-300">{mem.package?.name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>
                                {mem.start_date} → <b className="text-white">{mem.end_date}</b>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Chưa đăng ký gói</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Hiệu lực
                          </span>
                        ) : mem ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" /> Đã hết hạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Chưa có gói
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white">{m.total_checkins}</span>{" "}
                        <span className="text-slate-400">lượt</span>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openRenewModal(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 transition-all text-xs cursor-pointer"
                          title="Gia hạn hoặc đăng ký gói mới"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Gia hạn
                        </button>
                        <button
                          onClick={() => openMemberModal(m)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add / Edit Member */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-2xl w-full max-w-md p-6 rounded-3xl border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                {editingMember ? "Cập Nhật Hồ Sơ Hội Viên" : "Đăng Ký Hội Viên Mới"}
              </h3>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMemberSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Họ và tên hội viên
                </label>
                <input
                  type="text"
                  required
                  value={memberForm.full_name}
                  onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                  placeholder="Nguyễn Văn An"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="an.nguyen@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  placeholder="0912 345 678"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {editingMember ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu khởi tạo"}
                </label>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl gradient-btn-primary text-white font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  {submitting ? "Đang lưu..." : editingMember ? "Cập nhật" : "Lưu Hội Viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Renew Package */}
      {isRenewModalOpen && selectedMemberForRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900/95 backdrop-blur-2xl w-full max-w-md p-6 rounded-3xl border border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                Gia Hạn Gói Tập
              </h3>
              <button
                onClick={() => setIsRenewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs mb-4">
              <div className="text-slate-400 font-medium">Hội viên:</div>
              <div className="font-bold text-white text-sm mt-0.5">{selectedMemberForRenew.full_name}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Gói hiện tại:{" "}
                <b className="text-cyan-400">
                  {selectedMemberForRenew.active_membership?.package?.name || "Chưa có"}
                </b>
              </div>
            </div>

            <form onSubmit={handleRenewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Chọn gói tập gia hạn / đăng ký
                </label>
                <select
                  value={renewForm.package_id}
                  onChange={(e) => setRenewForm({ ...renewForm, package_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.duration_days} ngày) - {formatVND(pkg.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Phương thức thanh toán
                </label>
                <select
                  value={renewForm.payment_method}
                  onChange={(e) => setRenewForm({ ...renewForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all"
                >
                  <option value="cash">Tiền mặt tại quầy (Cash)</option>
                  <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                  <option value="momo_vnpay">Ví điện tử MoMo / VNPAY</option>
                  <option value="credit_card">Thẻ tín dụng (POS)</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-200 text-[11px] leading-relaxed">
                💡 <b>Cơ chế tự động:</b> Hệ thống tự động gia hạn cộng dồn ngày nếu gói còn hạn, kích hoạt trạng thái <b>ACTIVE</b> và sinh hóa đơn thanh toán đã hoàn thành.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl gradient-btn-primary text-white font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  {submitting ? "Đang xử lý..." : "Xác Nhận Thanh Toán & Kích Hoạt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
