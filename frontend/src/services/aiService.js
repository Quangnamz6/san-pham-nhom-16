import api from "./api";

export const aiService = {
  // 1. Gợi ý lịch tập tham khảo 1 tuần (kèm cảnh báo y tế)
  recommendWorkout: async (data) => {
    const response = await api.post("/ai/recommend-workout", data);
    return response.data;
  },

  // 2. Sinh tin nhắn nhắc lịch / gia hạn gói tập
  generateReminder: async (data) => {
    const response = await api.post("/ai/generate-reminder", data);
    return response.data;
  },

  // 3. Tóm tắt tiến độ tập luyện (30 ngày + nhận xét PT)
  summarizeProgress: async (data) => {
    const response = await api.post("/ai/summarize-progress", data);
    return response.data;
  },

  // Lấy nhật ký kiểm toán AI (Admin only)
  getAILogs: async (skip = 0, limit = 50) => {
    const response = await api.get(`/ai/logs?skip=${skip}&limit=${limit}`);
    return response.data;
  },
};
