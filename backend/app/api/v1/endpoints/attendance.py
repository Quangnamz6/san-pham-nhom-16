from typing import List, Optional
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_staff
from app.models.attendance import Attendance, AttendanceStatus
from app.models.membership import Membership, MembershipStatus
from app.models.workout_schedule import WorkoutSchedule
from app.models.user import User, UserRole
from app.schemas.attendance import AttendanceResponse

router = APIRouter()


class QuickCheckInRequest(BaseModel):
    member_id: Optional[int] = None
    phone: Optional[str] = None
    schedule_id: Optional[int] = None


class CheckInResultResponse(AttendanceResponse):
    membership_warning: Optional[str] = None


@router.get("/", response_model=List[AttendanceResponse])
def get_attendance_records(
    date_filter: Optional[str] = Query(None, description="YYYY-MM-DD"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách lịch sử điểm danh check-in."""
    query = db.query(Attendance)

    if current_user.role == UserRole.MEMBER:
        query = query.filter(Attendance.member_id == current_user.id)

    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(
                and_(
                    Attendance.check_in_time >= datetime.combine(target_date, datetime.min.time()),
                    Attendance.check_in_time <= datetime.combine(target_date, datetime.max.time()),
                )
            )
        except ValueError:
            pass

    return query.order_by(Attendance.check_in_time.desc()).offset(skip).limit(limit).all()


@router.post("/check-in", response_model=CheckInResultResponse, status_code=status.HTTP_201_CREATED)
def quick_check_in(
    payload: QuickCheckInRequest,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """
    Điểm danh hội viên tại quầy lễ tân:
    - Tìm kiếm theo ID hoặc Số điện thoại.
    - Kiểm tra hiệu lực gói tập: Nếu hết hạn hoặc chưa có gói, trả về cảnh báo để lễ tân tư vấn gia hạn.
    - Ghi nhận lịch sử check-in vào CSDL.
    """
    user = None
    if payload.member_id:
        user = db.query(User).filter(User.id == payload.member_id, User.role == UserRole.MEMBER).first()
    elif payload.phone:
        user = db.query(User).filter(User.phone == payload.phone.strip(), User.role == UserRole.MEMBER).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hội viên tương ứng với mã hoặc số điện thoại.",
        )

    # Check active membership
    today = date.today()
    active_membership = (
        db.query(Membership)
        .filter(
            Membership.user_id == user.id,
            Membership.status == MembershipStatus.ACTIVE,
            Membership.start_date <= today,
            Membership.end_date >= today,
        )
        .first()
    )

    membership_warning = None
    if not active_membership:
        # Check if expired
        latest_mem = (
            db.query(Membership)
            .filter(Membership.user_id == user.id)
            .order_by(Membership.end_date.desc())
            .first()
        )
        if latest_mem:
            membership_warning = f"Gói tập của hội viên đã hết hạn vào ngày {latest_mem.end_date}. Vui lòng thông báo gia hạn."
        else:
            membership_warning = "Hội viên chưa có gói tập hợp lệ. Cần đăng ký gói mới."

    # Validate schedule if provided
    schedule_id = payload.schedule_id
    if schedule_id:
        schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.id == schedule_id).first()
        if not schedule or schedule.member_id != user.id:
            schedule_id = None

    record = Attendance(
        member_id=user.id,
        schedule_id=schedule_id,
        check_in_time=datetime.now(timezone.utc),
        status=AttendanceStatus.PRESENT,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return CheckInResultResponse(
        id=record.id,
        member_id=record.member_id,
        schedule_id=record.schedule_id,
        check_in_time=record.check_in_time,
        status=record.status,
        created_at=record.created_at,
        member=user,
        membership_warning=membership_warning,
    )
