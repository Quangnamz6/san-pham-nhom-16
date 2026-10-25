from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_staff, get_current_admin
from app.models.ai_log import AILog
from app.models.user import User, UserRole
from app.models.attendance import Attendance
from app.models.workout_schedule import WorkoutSchedule
from app.schemas.ai import (
    WorkoutRecommendationRequest,
    WorkoutRecommendationResponse,
    ReminderMessageRequest,
    ReminderMessageResponse,
    ProgressSummaryRequest,
    ProgressSummaryResponse,
)
from app.schemas.ai_log import AILogResponse
from app.services.ai_service import AIService

router = APIRouter()


@router.post("/recommend-workout", response_model=WorkoutRecommendationResponse)
async def recommend_workout(
    payload: WorkoutRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    1. Gợi ý lịch tập tham khảo 1 tuần:
    - Input: Mục tiêu (goal), Thời gian rảnh (availability), Mức độ hiện tại (fitness_level), Tiền sử chấn thương (medical_notes).
    - Constraint: Luôn gắn CẢNH BÁO Y TẾ bắt buộc.
    - Output: Cấu trúc JSON ngày trong tuần, bài tập, sets/reps.
    - Ghi nhận lịch sử gọi AI vào bảng AILogs.
    """
    return await AIService.recommend_workout(
        db=db,
        request_data=payload,
        user_id=current_user.id,
    )


@router.post("/generate-reminder", response_model=ReminderMessageResponse)
async def generate_reminder(
    payload: ReminderMessageRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """
    2. Sinh tin nhắn nhắc lịch / gia hạn gói tập:
    - Input: Tên hội viên, Tên gói tập, Ngày hết hạn, Số buổi bỏ tập.
    - Output: Nội dung tin nhắn chăm sóc khách hàng lịch sự, ngắn gọn (phù hợp Zalo/SMS).
    - Ghi nhận lịch sử gọi AI vào bảng AILogs.
    """
    return await AIService.generate_reminder(
        db=db,
        request_data=payload,
        user_id=current_staff.id,
    )


@router.post("/summarize-progress", response_model=ProgressSummaryResponse)
async def summarize_progress(
    payload: ProgressSummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    3. Tóm tắt tiến độ tập luyện:
    - Input: Lịch sử điểm danh 30 ngày qua + Ghi chú của PT sau các buổi tập.
    - Nếu có `member_id`, hệ thống tự động tổng hợp số buổi điểm danh và ghi chú từ CSDL nếu chưa điền.
    - Output: Tóm tắt điểm tích cực, điểm cần cải thiện và lời khuyên tiếp theo.
    - Ghi nhận lịch sử gọi AI vào bảng AILogs.
    """
    # Auto enrich from database if member_id is provided
    target_member_id = payload.member_id or (current_user.id if current_user.role == UserRole.MEMBER else None)
    
    attendance_count = payload.attendance_count
    pt_notes = payload.pt_notes
    member_name = payload.member_name or "Hội viên"

    if target_member_id:
        member = db.query(User).filter(User.id == target_member_id).first()
        if member:
            member_name = member.full_name

        # Count attendance in the last total_days
        if attendance_count is None:
            since_date = datetime.now(timezone.utc) - timedelta(days=payload.total_days)
            attendance_count = (
                db.query(func.count(Attendance.id))
                .filter(Attendance.member_id == target_member_id, Attendance.check_in_time >= since_date)
                .scalar() or 0
            )

        # Gather recent PT notes from workout schedules
        if not pt_notes:
            recent_schedules = (
                db.query(WorkoutSchedule)
                .filter(
                    WorkoutSchedule.member_id == target_member_id,
                    WorkoutSchedule.notes.isnot(None),
                )
                .order_by(WorkoutSchedule.start_time.desc())
                .limit(5)
                .all()
            )
            if recent_schedules:
                pt_notes = " | ".join([f"{s.start_time.strftime('%d/%m')}: {s.notes}" for s in recent_schedules])

    enriched_request = ProgressSummaryRequest(
        member_id=target_member_id,
        member_name=member_name,
        total_days=payload.total_days,
        attendance_count=attendance_count if attendance_count is not None else 10,
        pt_notes=pt_notes or "Hội viên tham gia đầy đủ, thực hiện tốt các bài tập.",
    )

    return await AIService.summarize_progress(
        db=db,
        request_data=enriched_request,
        user_id=current_user.id,
    )


@router.get("/logs", response_model=List[AILogResponse])
def get_ai_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Xem nhật ký kiểm toán toàn bộ các yêu cầu gọi AI Engine (Chỉ Admin)."""
    return (
        db.query(AILog)
        .order_by(AILog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
