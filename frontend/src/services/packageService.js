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

  // Tạo gói tập mới (Admin/Lễ tân)
  createPackage: async (pkgData) => {
    const response = await api.post("/packages", pkgData);
    return response.data;
  },
};
