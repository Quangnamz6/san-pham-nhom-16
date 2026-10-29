import api, { getStoredAccessToken } from "./api";

const getAuthHeaders = () => {
  const token = getStoredAccessToken();
  if (token) {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    return { Authorization: `Bearer ${cleanToken}` };
  }
  return {};
};

export const scheduleService = {
  // Lấy lịch tập
  getSchedules: async ({ status = "", date_filter = "", member_id = "", user_id = "" } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (date_filter) params.append("date_filter", date_filter);
    if (member_id) params.append("member_id", member_id);
    if (user_id) params.append("user_id", user_id);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get(`/schedules/${qs}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Lấy lịch tập cá nhân của hội viên (endpoint tiện ích an toàn)
  getMySchedules: async () => {
    const response = await api.get("/schedules/my-schedules", {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Lấy toàn bộ lịch tập của tất cả hội viên (dành cho Admin & Lễ tân & Staff)
  getAllSchedules: async ({ search = "", status = "", date_filter = "", member_id = "", pt_id = "" } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (date_filter) params.append("date_filter", date_filter);
    if (member_id) params.append("member_id", member_id);
    if (pt_id) params.append("pt_id", pt_id);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const response = await api.get(`/schedules/all${qs}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Đặt lịch tập mới
  createSchedule: async (scheduleData) => {
    const response = await api.post("/schedules", scheduleData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Sinh lịch tập tự động với AI
  generateAISchedule: async ({ member_id, weeks = 4, goal } = {}) => {
    const response = await api.post(
      "/schedules/generate-ai",
      {
        member_id: member_id ? Number(member_id) : undefined,
        weeks: Number(weeks) || 4,
        goal: goal || undefined,
      },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Lưu hàng loạt lịch tập vào Database
  bulkCreateSchedules: async (schedules) => {
    const response = await api.post("/schedules/bulk", schedules, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Cập nhật thông tin / trạng thái buổi tập
  updateSchedule: async (scheduleId, updateData) => {
    const response = await api.put(`/schedules/${scheduleId}`, updateData, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Danh sách HLV PT
  getTrainers: async () => {
    const response = await api.get("/trainers");
    return response.data;
  },

  // Điểm danh check-in nhanh (Quầy lễ tân)
  quickCheckIn: async ({ member_id, phone, schedule_id }) => {
    const headers = getAuthHeaders();
    const payload = {
      member_id: member_id ? Number(member_id) : null,
      phone: phone ? String(phone).trim() : null,
      schedule_id: schedule_id ? Number(schedule_id) : null,
    };

    try {
      const response = await api.post("/attendance/check-in", payload, { headers });
      return response.data;
    } catch (err) {
      // Fallback sang endpoint /schedules/check-in nếu route attendance có vấn đề
      if (err.response?.status === 404 || err.response?.status === 405) {
        const fallbackRes = await api.post("/schedules/check-in", payload, { headers });
        return fallbackRes.data;
      }
      throw err;
    }
  },

  checkIn: async ({ member_id, phone, schedule_id }) => {
    return await scheduleService.quickCheckIn({ member_id, phone, schedule_id });
  },

  // Check-in trực tiếp theo ID lịch tập
  checkInSchedule: async (scheduleId) => {
    const headers = getAuthHeaders();
    try {
      const response = await api.put(`/schedules/${scheduleId}/check-in`, {}, { headers });
      return response.data;
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        // Fallback: cập nhật trạng thái sang checked_in
        return await scheduleService.updateSchedule(scheduleId, { status: "checked_in" });
      }
      throw err;
    }
  },

  // Danh sách lịch sử điểm danh
  getAttendance: async ({ date_filter = "" } = {}) => {
    const params = new URLSearchParams();
    if (date_filter) params.append("date_filter", date_filter);
    const response = await api.get(`/attendance?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Kích hoạt quét và gửi email nhắc nhở trước 2 giờ (toàn hệ thống)
  triggerReminders: async () => {
    const response = await api.post("/schedules/trigger-reminders", {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  // Gửi email nhắc nhở ngay cho 1 buổi tập
  sendScheduleReminder: async (scheduleId) => {
    const response = await api.post(`/schedules/${scheduleId}/send-reminder`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};
