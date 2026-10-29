import React from "react";
import { SchedulesPage } from "./SchedulesPage";

/**
 * ScheduleManagement component (alias for SchedulesPage)
 * Cung cấp toàn quyền quản trị Lịch tập, Điểm danh Check-in,
 * Sửa/Hủy/Đổi lịch tập cho Admin, Lễ tân và Staff.
 */
export const ScheduleManagement = (props) => {
  return <SchedulesPage {...props} />;
};

export default ScheduleManagement;

