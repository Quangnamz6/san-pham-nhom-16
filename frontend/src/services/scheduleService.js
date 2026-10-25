import api from "./api";

export const scheduleService = {
  // Lấy lịch tập
  getSchedules: async ({ status = "", date_filter = "", member_id = "" } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (date_filter) params.append("date_filter", date_filter);
    if (member_id) params.append("member_id", member_id);
    const response = await api.get(`/schedules?${params.toString()}`);
    return response.data;
  },

  // Đặt lịch tập mới
  createSchedule: async (scheduleData) => {
    const response = await api.post("/schedules", scheduleData);
    return response.data;
  },

  // Sinh lịch tập tự động với AI
  generateAISchedule: async ({ member_id, weeks = 4, goal } = {}) => {
    const response = await api.post("/schedules/generate-ai", {
      member_id: member_id ? Number(member_id) : undefined,
      weeks: Number(weeks) || 4,
      goal: goal || undefined,
    });
    return response.data;
  },

  // Lưu hàng loạt lịch tập vào Database
  bulkCreateSchedules: async (schedules) => {
    const response = await api.post("/schedules/bulk", schedules);
    return response.data;
  },

  // Cập nhật trạng thái buổi tập
  updateSchedule: async (scheduleId, updateData) => {
    const response = await api.put(`/schedules/${scheduleId}`, updateData);
    return response.data;
  },

  // Danh sách HLV PT
  getTrainers: async () => {
    const response = await api.get("/trainers");
    return response.data;
  },

  // Điểm danh check-in nhanh
  quickCheckIn: async ({ member_id, phone, schedule_id }) => {
    const response = await api.post("/attendance/check-in", {
      member_id: member_id ? Number(member_id) : null,
      phone: phone || null,
      schedule_id: schedule_id ? Number(schedule_id) : null,
    });
    return response.data;
  },

  // Danh sách lịch sử điểm danh
  getAttendance: async ({ date_filter = "" } = {}) => {
    const params = new URLSearchParams();
    if (date_filter) params.append("date_filter", date_filter);
    const response = await api.get(`/attendance?${params.toString()}`);
    return response.data;
  },
};
