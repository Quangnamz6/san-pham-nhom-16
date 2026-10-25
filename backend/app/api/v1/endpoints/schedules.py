from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_staff
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from app.schemas.workout_schedule import (
    WorkoutScheduleCreate,
    WorkoutScheduleUpdate,
    WorkoutScheduleResponse,
)
from app.services.schedule_generator import (
    generate_default_schedules_for_member,
    generate_ai_schedules_for_member,
)

router = APIRouter()


class GenerateAIScheduleRequest(BaseModel):
    member_id: Optional[int] = None
    weeks: Optional[int] = Field(default=4, ge=1, le=4)
    goal: Optional[str] = None


@router.get("/", response_model=List[WorkoutScheduleResponse])
def get_workout_schedules(
    status_filter: Optional[ScheduleStatus] = Query(None, alias="status"),
    date_filter: Optional[str] = Query(None, description="YYYY-MM-DD lọc theo ngày tập"),
    member_id: Optional[int] = Query(None, description="Lọc theo ID hội viên"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách lịch tập:
    - PT chỉ thấy lịch của mình (hoặc lọc theo member_id nếu truyền).
    - Hội viên chỉ thấy lịch của chính mình.
    - Admin / Lễ tân thấy toàn bộ lịch của trung tâm hoặc lọc theo member_id.
    - Eager load quan hệ User và Trainer để tối ưu hiển thị.
    """
    query = (
        db.query(WorkoutSchedule)
        .options(
            joinedload(WorkoutSchedule.member),
            joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
        )
    )

    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).lower()

    if user_role_str == "pt":
        trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if not trainer:
            return []
        query = query.filter(WorkoutSchedule.pt_id == trainer.id)
        if member_id:
            query = query.filter(WorkoutSchedule.member_id == member_id)
    elif user_role_str == "member":
        # Đảm bảo query lấy đúng danh sách lịch tập theo member_id của hội viên đang đăng nhập
        query = query.filter(WorkoutSchedule.member_id == current_user.id)
    else:
        # Admin / Lễ tân: Có thể lọc theo member_id nếu được truyền
        if member_id:
            query = query.filter(WorkoutSchedule.member_id == member_id)

    if status_filter:
        query = query.filter(WorkoutSchedule.status == status_filter)

    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(
                and_(
                    WorkoutSchedule.start_time >= datetime.combine(target_date, datetime.min.time()),
                    WorkoutSchedule.start_time <= datetime.combine(target_date, datetime.max.time()),
                )
            )
        except ValueError:
            pass

    return query.order_by(WorkoutSchedule.start_time.asc()).offset(skip).limit(limit).all()


@router.post("/generate-ai", response_model=List[WorkoutScheduleResponse])
async def generate_ai_schedules_endpoint(
    payload: Optional[GenerateAIScheduleRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tạo lịch tập tự động với AI:
    - Đọc thông tin gói tập hiện tại của Hội viên (mục tiêu tăng/giảm cân, thời hạn gói).
    - Gọi AI Service (AIService.recommend_workout) để gợi ý lịch tập 1-4 tuần.
    - Lưu trực tiếp danh sách lịch tập AI vừa sinh vào Database.
    """
    target_member_id = current_user.id
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).lower()

    if user_role_str in ["admin", "receptionist", "pt"] and payload and payload.member_id:
        target_member_id = payload.member_id

    weeks = payload.weeks if (payload and payload.weeks) else 4
    custom_goal = payload.goal if payload else None

    created = await generate_ai_schedules_for_member(
        db=db,
        member_id=target_member_id,
        weeks=weeks,
        custom_goal=custom_goal,
    )
    return created


@router.post("/", response_model=WorkoutScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    schedule_in: WorkoutScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Đặt lịch tập mới với Huấn luyện viên:
    - Kiểm tra PT và Hội viên hợp lệ.
    - Kiểm tra xung đột lịch: PT không bị trùng giờ với buổi tập khác đang ở trạng thái SCHEDULED.
    """
    # Verify Trainer
    trainer = db.query(Trainer).filter(Trainer.id == schedule_in.pt_id).first()
    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy Huấn luyện viên được chỉ định.",
        )

    # Check member ID
    member_id = schedule_in.member_id
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).lower()
    if user_role_str == "member":
        # Enforce member can only book for themselves
        member_id = current_user.id

    member = db.query(User).filter(User.id == member_id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hội viên không tồn tại.",
        )

    # Validate time logic
    if schedule_in.end_time <= schedule_in.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian kết thúc phải sau thời gian bắt đầu.",
        )

    # Conflict check for Trainer
    conflict = (
        db.query(WorkoutSchedule)
        .filter(
            WorkoutSchedule.pt_id == trainer.id,
            WorkoutSchedule.status == ScheduleStatus.SCHEDULED,
            or_(
                and_(
                    WorkoutSchedule.start_time <= schedule_in.start_time,
                    WorkoutSchedule.end_time > schedule_in.start_time,
                ),
                and_(
                    WorkoutSchedule.start_time < schedule_in.end_time,
                    WorkoutSchedule.end_time >= schedule_in.end_time,
                ),
                and_(
                    WorkoutSchedule.start_time >= schedule_in.start_time,
                    WorkoutSchedule.end_time <= schedule_in.end_time,
                ),
            ),
        )
        .first()
    )

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Huấn luyện viên đã có lịch tập khác từ {conflict.start_time.strftime('%H:%M')} đến {conflict.end_time.strftime('%H:%M')}.",
        )

    schedule = WorkoutSchedule(
        member_id=member_id,
        pt_id=schedule_in.pt_id,
        start_time=schedule_in.start_time,
        end_time=schedule_in.end_time,
        status=schedule_in.status,
        notes=schedule_in.notes,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.post("/bulk", response_model=List[WorkoutScheduleResponse], status_code=status.HTTP_201_CREATED)
def bulk_create_schedules(
    schedules_in: List[WorkoutScheduleCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lưu danh sách nhiều buổi tập vào Database cùng lúc."""
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).lower()

    created_list = []
    for s_in in schedules_in:
        m_id = current_user.id if user_role_str == "member" else s_in.member_id
        sched = WorkoutSchedule(
            member_id=m_id,
            pt_id=s_in.pt_id,
            start_time=s_in.start_time,
            end_time=s_in.end_time,
            status=s_in.status,
            notes=s_in.notes,
        )
        db.add(sched)
        created_list.append(sched)

    db.commit()
    for s in created_list:
        db.refresh(s)
    return created_list


@router.put("/{schedule_id}", response_model=WorkoutScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule_in: WorkoutScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật trạng thái buổi tập (scheduled, completed, cancelled) hoặc ghi chú bài tập."""
    schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lịch tập không tồn tại.",
        )

    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).lower()

    # Verify permission
    if user_role_str == "pt":
        trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if not trainer or schedule.pt_id != trainer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật lịch này.")
    elif user_role_str == "member" and schedule.member_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật lịch này.")

    for field, value in schedule_in.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)
    return schedule
