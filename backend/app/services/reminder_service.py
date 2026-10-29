import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from app.core.database import SessionLocal
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.trainer import Trainer
from app.models.user import User
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

# Global background task reference
_reminder_task: asyncio.Task = None


def scan_and_send_schedule_reminders(
    db: Session,
    window_start_minutes: int = 115,
    window_end_minutes: int = 125,
) -> List[Tuple[int, str, bool]]:
    """
    Quét CSDL tìm các buổi tập sắp diễn ra trước khoảng 2 tiếng (115 - 125 phút tới)
    ở trạng thái SCHEDULED và chưa gửi email nhắc nhở (is_reminder_sent == False).
    """
    now = datetime.now(timezone.utc)
    start_window = now + timedelta(minutes=window_start_minutes)
    end_window = now + timedelta(minutes=window_end_minutes)

    logger.info(
        f"🔍 [REMINDER_CRON] Đang quét lịch tập sắp tới từ {start_window.strftime('%H:%M %d/%m')} "
        f"đến {end_window.strftime('%H:%M %d/%m')} (mốc trước ~2 tiếng)..."
    )

    # Truy vấn danh sách lịch tập thỏa mãn điều kiện
    upcoming_schedules = (
        db.query(WorkoutSchedule)
        .options(
            joinedload(WorkoutSchedule.member),
            joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
        )
        .filter(
            WorkoutSchedule.status == ScheduleStatus.SCHEDULED,
            WorkoutSchedule.is_reminder_sent.is_(False),
            WorkoutSchedule.start_time >= start_window,
            WorkoutSchedule.start_time <= end_window,
        )
        .all()
    )

    results = []
    if not upcoming_schedules:
        logger.info("ℹ️ [REMINDER_CRON] Không có buổi tập nào cần gửi email nhắc 2h trong khung giờ này.")
        return results

    logger.info(f"📢 [REMINDER_CRON] Tìm thấy {len(upcoming_schedules)} buổi tập cần gửi email nhắc nhở 2h!")

    for sched in upcoming_schedules:
        member = sched.member
        if not member or not member.email:
            logger.warning(
                f"⚠️ [REMINDER_CRON] Buổi tập #{sched.id} không có email hội viên hợp lệ để gửi thông báo."
            )
            continue

        trainer_name = "Chưa chỉ định HLV"
        if sched.pt and sched.pt.user:
            trainer_name = sched.pt.user.full_name

        success, err = email_service.send_2hour_reminder_email(
            to_email=member.email,
            recipient_name=member.full_name,
            schedule_id=sched.id,
            start_time=sched.start_time,
            end_time=sched.end_time,
            trainer_name=trainer_name,
            notes=sched.notes,
        )

        if success:
            sched.is_reminder_sent = True
            db.commit()
            logger.info(
                f"✅ [REMINDER_SUCCESS] Đã gửi email nhắc tập trước 2h cho hội viên "
                f"'{member.full_name}' ({member.email}) - Buổi tập #{sched.id} lúc {sched.start_time}."
            )
            results.append((sched.id, member.email, True))
        else:
            logger.error(
                f"❌ [REMINDER_FAILED] Thất bại khi gửi email nhắc cho hội viên {member.email}: {err}"
            )
            results.append((sched.id, member.email, False))

    return results


async def _reminder_loop(interval_seconds: int = 300):
    """
    Vòng lặp chạy ngầm định kỳ (mỗi 5 phút = 300 giây) quét và gửi email nhắc lịch 2h.
    """
    logger.info(f"🚀 [REMINDER_CRON] Khởi động Background Cron Job nhắc lịch tập (chu kỳ {interval_seconds}s)...")
    while True:
        try:
            db = SessionLocal()
            try:
                scan_and_send_schedule_reminders(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"❌ [REMINDER_CRON] Lỗi trong tiến trình quét lịch tập tự động: {e}", exc_info=True)

        await asyncio.sleep(interval_seconds)


def start_reminder_scheduler(interval_seconds: int = 300) -> asyncio.Task:
    """Bắt đầu tiến trình chạy ngầm quét lịch tập định kỳ."""
    global _reminder_task
    if _reminder_task is None or _reminder_task.done():
        loop = asyncio.get_event_loop()
        _reminder_task = loop.create_task(_reminder_loop(interval_seconds=interval_seconds))
        logger.info("✅ [REMINDER_CRON] Tiến trình Cron Job gửi email nhắc lịch 2h đã được kích hoạt.")
    return _reminder_task


def stop_reminder_scheduler():
    """Hủy tiến trình chạy ngầm khi dừng server."""
    global _reminder_task
    if _reminder_task and not _reminder_task.done():
        _reminder_task.cancel()
        logger.info("🛑 [REMINDER_CRON] Tiến trình Cron Job gửi email nhắc lịch đã dừng an toàn.")
