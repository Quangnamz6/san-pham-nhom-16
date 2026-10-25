import api from "./api";

export const membershipService = {
  // Lấy danh sách các gói tập đã đăng ký của hội viên đang đăng nhập
  getMyMemberships: async () => {
    const response = await api.get("/memberships/my-memberships");
    return response.data;
  },

  // Gia hạn gói tập
  renewMembership: async (membershipId, payload) => {
    const response = await api.post(`/memberships/${membershipId}/renew`, payload);
    return response.data;
  },
};

export default membershipService;
