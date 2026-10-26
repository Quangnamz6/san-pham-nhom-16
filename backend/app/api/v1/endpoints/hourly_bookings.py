import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.hourly_booking import HourlyBooking, HourlyBookingType, HourlyBookingStatus
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from app.schemas.hourly_booking import HourlyBookingCreate, HourlyBookingResponse

router = APIRouter()


def parse_slot_to_datetimes(booking_date_str: str, time_slot_str: str, duration_hours: int = 1):
    """Chuyển đổi booking_date ('YYYY-MM-DD') và time_slot ('08:00 - 10:00') thành cặp start_time, end_time."""
    try:
        date_obj = datetime.strptime(booking_date_str.strip(), "%Y-%m-%d").date()
    except Exception:
        date_obj = datetime.now().date()

    try:
        if "-" in time_slot_str:
            parts = [p.strip() for p in time_slot_str.split("-")]
            start_t = datetime.strptime(parts[0][:5], "%H:%M").time()
            end_t = datetime.strptime(parts[1][:5], "%H:%M").time()
            start_dt = datetime.combine(date_obj, start_t)
            end_dt = datetime.combine(date_obj, end_t)
            if end_dt <= start_dt:
                end_dt = start_dt + timedelta(hours=max(1, duration_hours))
            return start_dt, end_dt
        else:
            time_part = time_slot_str.strip()[:5]
            start_t = datetime.strptime(time_part, "%H:%M").time()
            start_dt = datetime.combine(date_obj, start_t)
            end_dt = start_dt + timedelta(hours=max(1, duration_hours))
            return start_dt, end_dt
    except Exception:
        start_dt = datetime.combine(date_obj, datetime.strptime("08:00", "%H:%M").time())
        end_dt = start_dt + timedelta(hours=max(1, duration_hours))
        return start_dt, end_dt


@router.post("", response_model=HourlyBookingResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=HourlyBookingResponse, status_code=status.HTTP_201_CREATED)
def create_hourly_booking(
    booking_in: HourlyBookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Đặt Vé Tập Linh Hoạt (Tự tập hoặc Thuê PT theo giờ):
    - Lưu thông tin đặt vé vào bảng hourly_bookings.
    - Đồng bộ tự động lịch hẹn vào bảng workout_schedules để hiển thị ngay trong Lịch tập của Hội viên.
    - Sinh mã vé điện tử định dạng VP-YYMMDD-XXXX duy nhất.
    """
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).lower()

    # Determine targeted member
    target_user_id = current_user.id
    if user_role_str in ["admin", "receptionist"] and booking_in.user_id:
        target_user = db.query(User).filter(User.id == booking_in.user_id).first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tài khoản Hội viên không tồn tại.",
            )
        target_user_id = target_user.id

    # If PT booking, verify trainer exists
    trainer = None
    if booking_in.trainer_id:
        trainer = db.query(Trainer).filter(Trainer.id == booking_in.trainer_id).first()
        if not trainer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Huấn luyện viên không tồn tại.",
            )

    # Generate unique ticket code
    random_suffix = uuid.uuid4().hex[:6].upper()
    date_code = datetime.now().strftime("%y%m%d")
    ticket_code = f"VP-{date_code}-{random_suffix}"

    # Transaction code
    trans_code = booking_in.transaction_code or f"QR-MB-{int(datetime.now().timestamp())}"

    # Create HourlyBooking instance
    hourly_booking = HourlyBooking(
        user_id=target_user_id,
        booking_type=booking_in.booking_type,
        package_title=booking_in.package_title,
        trainer_id=booking_in.trainer_id,
        booking_date=booking_in.booking_date,
        time_slot=booking_in.time_slot,
        duration_hours=booking_in.duration_hours,
        price=booking_in.price,
        status=HourlyBookingStatus.CONFIRMED,
        payment_method=booking_in.payment_method or "vietqr_transfer",
        transaction_code=trans_code,
        ticket_code=ticket_code,
        notes=booking_in.notes,
    )
    db.add(hourly_booking)
    db.flush()

    # Synchronize into WorkoutSchedule table
    start_dt, end_dt = parse_slot_to_datetimes(
        booking_date_str=booking_in.booking_date,
        time_slot_str=booking_in.time_slot,
        duration_hours=booking_in.duration_hours,
    )

    # Select assigned PT ID (if trainer chosen use it, otherwise default to first available trainer for gym floor supervision)
    assigned_pt_id = booking_in.trainer_id
    if not assigned_pt_id:
        first_trainer = db.query(Trainer).first()
        assigned_pt_id = first_trainer.id if first_trainer else 1

    type_name = "Thuê PT 1:1" if booking_in.booking_type == HourlyBookingType.PT_SESSION else "Tự Tập Theo Giờ"
    notes_parts = [
        f"[Vé Linh Hoạt - {type_name}] {booking_in.package_title}",
        f"Mã vé: {ticket_code}",
        f"Khung giờ: {booking_in.time_slot}",
    ]
    if booking_in.notes:
        notes_parts.append(f"Ghi chú: {booking_in.notes}")

    workout_schedule = WorkoutSchedule(
        member_id=target_user_id,
        pt_id=assigned_pt_id,
        start_time=start_dt,
        end_time=end_dt,
        status=ScheduleStatus.SCHEDULED,
        notes=" | ".join(notes_parts),
    )
    db.add(workout_schedule)

    db.commit()
    db.refresh(hourly_booking)

    return hourly_booking


@router.get("", response_model=List[HourlyBookingResponse])
@router.get("/", response_model=List[HourlyBookingResponse])
def get_hourly_bookings(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = Query(None, description="Lọc theo ID hội viên"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách các vé tập theo giờ:
    - Hội viên: Chỉ xem vé của bản thân.
    - Admin & Lễ tân: Xem toàn bộ hoặc lọc theo user_id.
    """
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).lower()

    query = (
        db.query(HourlyBooking)
        .options(
            joinedload(HourlyBooking.user),
            joinedload(HourlyBooking.trainer).joinedload(Trainer.user),
        )
        .order_by(HourlyBooking.created_at.desc())
    )

    if user_role_str == "member":
        query = query.filter(HourlyBooking.user_id == current_user.id)
    elif user_id:
        query = query.filter(HourlyBooking.user_id == user_id)

    return query.offset(skip).limit(limit).all()


@router.get("/my-bookings", response_model=List[HourlyBookingResponse])
def get_my_hourly_bookings(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách vé tập linh hoạt của riêng Hội viên đang đăng nhập."""
    bookings = (
        db.query(HourlyBooking)
        .options(
            joinedload(HourlyBooking.user),
            joinedload(HourlyBooking.trainer).joinedload(Trainer.user),
        )
        .filter(HourlyBooking.user_id == current_user.id)
        .order_by(HourlyBooking.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return bookings
