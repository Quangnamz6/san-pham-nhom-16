import api from "./api";

export const packageService = {
  // Lấy danh mục gói tập
  getPackages: async () => {
    const response = await api.get("/packages");
    return response.data;
  },

  // Gia hạn hoặc đăng ký mới gói tập cho hội viên
  renewPackage: async (payload) => {
    const response = await api.post("/payments/renew", payload);
    return response.data;
  },

  // Tạo gói tập mới (Admin)
  createPackage: async (pkgData) => {
    const response = await api.post("/packages", pkgData);
    return response.data;
  },

  // Cập nhật thông tin gói tập (Admin)
  updatePackage: async (id, pkgData) => {
    const response = await api.put(`/packages/${id}`, pkgData);
    return response.data;
  },

  // Xóa gói tập (Admin)
  deletePackage: async (id) => {
    const response = await api.delete(`/packages/${id}`);
    return response.data;
  },
};

