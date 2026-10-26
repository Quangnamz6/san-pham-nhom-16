import api from "./api";

export const hourlyPassService = {
  // Đặt vé tập theo giờ / thuê PT
  createBooking: async (bookingData) => {
    const response = await api.post("/hourly-bookings", bookingData);
    return response.data;
  },

  // Lấy danh sách vé của hội viên hiện tại
  getMyBookings: async () => {
    const response = await api.get("/hourly-bookings/my-bookings");
    return response.data;
  },

  // Lấy tất cả vé (Admin / Lễ tân)
  getBookings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/hourly-bookings${query ? `?${query}` : ""}`);
    return response.data;
  },

  // Lấy danh sách Huấn luyện viên
  getTrainers: async () => {
    const response = await api.get("/trainers");
    return response.data;
  },
};

export default hourlyPassService;
