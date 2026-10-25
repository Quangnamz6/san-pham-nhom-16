import api from "./api";

export const memberService = {
  // Lấy danh sách hội viên kèm tìm kiếm & bộ lọc trạng thái
  getMembers: async ({ search = "", status = "", skip = 0, limit = 50 } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status && status !== "all") params.append("status", status);
    params.append("skip", skip);
    params.append("limit", limit);

    const response = await api.get(`/members?${params.toString()}`);
    return response.data;
  },

  // Chi tiết hội viên
  getMemberDetail: async (memberId) => {
    const response = await api.get(`/members/${memberId}`);
    return response.data;
  },

  // Tạo hội viên mới
  createMember: async (memberData) => {
    const response = await api.post("/members", memberData);
    return response.data;
  },

  // Cập nhật hội viên
  updateMember: async (memberId, updateData) => {
    const response = await api.put(`/members/${memberId}`, updateData);
    return response.data;
  },

  // Xóa hội viên
  deleteMember: async (memberId) => {
    const response = await api.delete(`/members/${memberId}`);
    return response.data;
  },
};
