import React from "react";
import { SchedulesPage } from "./SchedulesPage";

/**
 * MySchedule component
 * Hiển thị danh sách lịch tập cá nhân của Hội viên, hỗ trợ đặt lịch mới,
 * tạo lịch tập bằng AI và xem lịch sử tập luyện.
 */
export const MySchedule = (props) => {
  return <SchedulesPage {...props} />;
};

export default MySchedule;

