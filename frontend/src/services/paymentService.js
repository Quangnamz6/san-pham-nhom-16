import api from "./api";

export const paymentService = {
  // Lấy danh sách lịch sử giao dịch thanh toán
  getPayments: async (params = {}) => {
    const response = await api.get("/payments/", { params });
    return response.data;
  },

  // Tạo thanh toán mới
  createPayment: async (paymentData) => {
    const response = await api.post("/payments/", paymentData);
    return response.data;
  },

  // Gia hạn gói tập
  renewPackage: async (payload) => {
    const response = await api.post("/payments/renew", payload);
    return response.data;
  },
};
