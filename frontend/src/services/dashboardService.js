import api from "./api";

export const dashboardService = {
  // Lấy dữ liệu thống kê tổng quan (Hội viên mới, sắp hết hạn, doanh thu, check-in)
  getDashboardStats: async () => {
    const response = await api.get("/dashboard/stats");
    return response.data;
  },
};
