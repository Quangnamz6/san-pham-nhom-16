import logging
from typing import List, Optional
from datetime import datetime, timezone, date
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, cast, String

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_staff
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.trainer import Trainer
from app.models.user import User, UserRole
from app.models.attendance import Attendance, AttendanceStatus
from app.schemas.workout_schedule import (
    WorkoutScheduleCreate,
    WorkoutScheduleUpdate,
    WorkoutScheduleResponse,
)
from app.services.schedule_generator import (
    generate_default_schedules_for_member,
    generate_ai_schedules_for_member,
)
from app.services.email_service import email_service
from app.services.reminder_service import scan_and_send_schedule_reminders

logger = logging.getLogger(__name__)
router = APIRouter()


class GenerateAIScheduleRequest(BaseModel):
    member_id: Optional[int] = None
    weeks: Optional[int] = Field(default=4, ge=1, le=4)
    goal: Optional[str] = None


class QuickCheckInScheduleRequest(BaseModel):
    member_id: Optional[int] = None
    phone: Optional[str] = None
    schedule_id: Optional[int] = None


@router.get("", response_model=List[WorkoutScheduleResponse])
@router.get("/", response_model=List[WorkoutScheduleResponse])
@router.get("/my-schedules", response_model=List[WorkoutScheduleResponse])
def get_workout_schedules(
    status_filter: Optional[ScheduleStatus] = Query(None, alias="status"),
    date_filter: Optional[str] = Query(None, description="YYYY-MM-DD lọc theo ngày tập"),
    member_id: Optional[int] = Query(None, description="Lọc theo ID hội viên"),
    user_id: Optional[int] = Query(None, description="Lọc theo ID người dùng / hội viên"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lấy danh sách lịch tập:
    - Nếu là Hội viên (role == 'member'): Trả về đúng tất cả các lịch tập thuộc sở hữu của current_user.id.
    - Nếu là Admin/Lễ tân (role in ['admin', 'receptionist', 'staff']): Trả về toàn bộ lịch tập hoặc danh sách theo user_id đang chọn.
    - PT: Trả về lịch của chính mình (hoặc lọc theo hội viên nếu truyền).
    - Có khối try...except an toàn tránh nổ lỗi 500 khi thông tin liên kết bị null.
    """
    try:
        user_role_str = str(
            current_user.role.value if hasattr(current_user.role, "value") else current_user.role
        ).strip().lower()

        target_member_id = member_id or user_id

        query = (
            db.query(WorkoutSchedule)
            .options(
                joinedload(WorkoutSchedule.member),
                joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
            )
        )

        allowed_staff = ["admin", "receptionist", "reception", "staff"]

        if user_role_str in allowed_staff:
            # Admin & Lễ tân / Staff: Có thể lọc theo user_id nếu được truyền, ngược lại lấy toàn bộ
            if target_member_id:
                query = query.filter(WorkoutSchedule.member_id == target_member_id)
        elif user_role_str == "pt":
            trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
            if not trainer:
                return []
            query = query.filter(WorkoutSchedule.pt_id == trainer.id)
            if target_member_id:
                query = query.filter(WorkoutSchedule.member_id == target_member_id)
        else:
            # Hội viên (role == 'member'): Đảm bảo luôn lấy đúng lịch tập của chính mình
            query = query.filter(WorkoutSchedule.member_id == current_user.id)

        if status_filter:
            query = query.filter(WorkoutSchedule.status == status_filter)

        if date_filter:
            try:
                target_date = datetime.strptime(date_filter.strip(), "%Y-%m-%d").date()
                query = query.filter(
                    and_(
                        WorkoutSchedule.start_time >= datetime.combine(target_date, datetime.min.time()),
                        WorkoutSchedule.start_time <= datetime.combine(target_date, datetime.max.time()),
                    )
                )
            except ValueError:
                pass

        results = query.order_by(WorkoutSchedule.start_time.asc()).offset(skip).limit(limit).all()
        return results
    except Exception as e:
        logger.error(f"Lỗi an toàn khi truy vấn danh sách lịch tập: {str(e)}", exc_info=True)
        return []


@router.get("/all", response_model=List[WorkoutScheduleResponse])
@router.get("/all/", response_model=List[WorkoutScheduleResponse])
def get_all_schedules(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Tên hội viên, Mã hội viên, hoặc Số điện thoại"),
    member_id: Optional[int] = Query(None, description="Lọc theo ID hội viên"),
    user_id: Optional[int] = Query(None, description="Lọc theo ID hội viên / user_id"),
    pt_id: Optional[int] = Query(None, description="Lọc theo ID huấn luyện viên (PT)"),
    date_filter: Optional[str] = Query(None, description="YYYY-MM-DD lọc theo ngày tập"),
    status_filter: Optional[ScheduleStatus] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff),
):
    """
    API dành riêng cho Admin và Lễ tân:
    - Lấy toàn bộ danh sách lịch tập của tất cả hội viên trong hệ thống.
    - Hỗ trợ lọc theo Tên/Mã/SĐT hội viên, HLV phụ trách (PT), Ngày tập, Trạng thái.
    - Xử lý ngoại lệ an toàn tránh lỗi 500.
    """
    try:
        target_member_id = member_id or user_id
        query = (
            db.query(WorkoutSchedule)
            .outerjoin(WorkoutSchedule.member)
            .options(
                joinedload(WorkoutSchedule.member),
                joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
            )
        )

        if search and search.strip():
            term = f"%{search.strip()}%"
            is_num = search.strip().isdigit()
            if is_num:
                query = query.filter(
                    or_(
                        User.full_name.ilike(term),
                        User.phone.ilike(term),
                        User.id == int(search.strip()),
                    )
                )
            else:
                query = query.filter(
                    or_(
                        User.full_name.ilike(term),
                        User.phone.ilike(term),
                    )
                )

        if target_member_id:
            query = query.filter(WorkoutSchedule.member_id == target_member_id)

        if pt_id:
            query = query.filter(WorkoutSchedule.pt_id == pt_id)

        if status_filter:
            query = query.filter(WorkoutSchedule.status == status_filter)

        if date_filter:
            try:
                target_date = datetime.strptime(date_filter.strip(), "%Y-%m-%d").date()
                query = query.filter(
                    and_(
                        WorkoutSchedule.start_time >= datetime.combine(target_date, datetime.min.time()),
                        WorkoutSchedule.start_time <= datetime.combine(target_date, datetime.max.time()),
                    )
                )
            except ValueError:
                pass

        return query.order_by(WorkoutSchedule.start_time.asc()).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Lỗi an toàn khi lấy toàn bộ lịch tập (Admin/Staff): {str(e)}", exc_info=True)
        return []


@router.post("/trigger-reminders")
def trigger_schedule_reminders(
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """
    Kích hoạt thủ công tiến trình quét và gửi email nhắc nhở trước 2 giờ:
    - Dành cho Admin và Lễ tân.
    - Quét các buổi tập sắp diễn ra trong khoảng ~2 tiếng tới (115-125 phút) và gửi email qua SMTP.
    """
    results = scan_and_send_schedule_reminders(db=db)
    return {
        "success": True,
        "scanned_count": len(results),
        "sent_count": sum(1 for r in results if r[2]),
        "details": [{"schedule_id": r[0], "email": r[1], "success": r[2]} for r in results],
    }


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

    if user_role_str in ["admin", "receptionist", "reception", "staff", "pt"] and payload and payload.member_id:
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


@router.post("/check-in")
def schedule_quick_check_in(
    payload: QuickCheckInScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Check-in điểm danh hội viên (dành cho Admin, Lễ tân & Staff):
    - Chuẩn hóa chuỗi Role sang viết thường.
    - Cho phép vai trò admin, receptionist, reception, staff thực hiện.
    - Cập nhật trạng thái buổi tập sang CHECKED_IN và ghi nhận Attendance vào CSDL.
    """
    allowed_roles = ["admin", "receptionist", "reception", "staff"]
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).strip().lower()

    if user_role_str not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền thực hiện thao tác này",
        )

    user = None
    if payload.member_id:
        user = db.query(User).filter(User.id == payload.member_id).first()
    elif payload.phone:
        user = db.query(User).filter(User.phone == payload.phone.strip()).first()
    elif payload.schedule_id:
        sched = db.query(WorkoutSchedule).filter(WorkoutSchedule.id == payload.schedule_id).first()
        if sched:
            user = db.query(User).filter(User.id == sched.member_id).first()
            payload.member_id = sched.member_id

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hội viên tương ứng với mã hoặc số điện thoại.",
        )

    # Validate schedule if provided
    schedule_id = payload.schedule_id
    if schedule_id:
        schedule = db.query(WorkoutSchedule).filter(WorkoutSchedule.id == schedule_id).first()
        if schedule and schedule.member_id == user.id:
            schedule.status = ScheduleStatus.CHECKED_IN
        else:
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

    return {
        "success": True,
        "message": f"Điểm danh thành công cho hội viên {user.full_name}!",
        "attendance_id": record.id,
        "member_id": user.id,
        "member": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
        },
        "schedule_id": schedule_id,
        "check_in_time": record.check_in_time,
    }


@router.put("/{schedule_id}/check-in", response_model=WorkoutScheduleResponse)
@router.post("/{schedule_id}/check-in", response_model=WorkoutScheduleResponse)
def check_in_by_schedule_id(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Check-in trực tiếp theo ID lịch tập:
    - Cho phép Admin, Lễ tân, Staff và Huấn luyện viên (PT) phụ trách.
    - Cập nhật trạng thái lịch tập thành CHECKED_IN và tạo bản ghi Attendance.
    """
    allowed_roles = ["admin", "receptionist", "reception", "staff", "pt"]
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).strip().lower()

    if user_role_str not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền thực hiện thao tác này",
        )

    schedule = (
        db.query(WorkoutSchedule)
        .options(
            joinedload(WorkoutSchedule.member),
            joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
        )
        .filter(WorkoutSchedule.id == schedule_id)
        .first()
    )
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lịch tập không tồn tại.",
        )

    if user_role_str == "pt":
        trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if not trainer or schedule.pt_id != trainer.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HLV chỉ được phép check-in lịch của chính mình.",
            )

    schedule.status = ScheduleStatus.CHECKED_IN

    # Record attendance
    record = Attendance(
        member_id=schedule.member_id,
        schedule_id=schedule.id,
        check_in_time=datetime.now(timezone.utc),
        status=AttendanceStatus.PRESENT,
    )
    db.add(record)
    db.commit()
    db.refresh(schedule)

    return schedule


@router.post("", response_model=WorkoutScheduleResponse, status_code=status.HTTP_201_CREATED)
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
    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).strip().lower()
    allowed_staff = ["admin", "receptionist", "reception", "staff"]

    if user_role_str == "member":
        # Enforce member can only book for themselves
        member_id = current_user.id
    elif user_role_str in allowed_staff:
        # Admin / Lễ tân / Staff có thể đặt lịch tập mới cho bất kỳ hội viên nào
        member_id = schedule_in.member_id or current_user.id
    else:
        member_id = schedule_in.member_id or current_user.id

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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cập nhật thời gian, PT, trạng thái và ghi chú lịch tập:
    - Admin & Receptionist: Có toàn quyền cập nhật thời gian, đổi PT, trạng thái, ghi chú của mọi hội viên.
    - PT: Có quyền cập nhật trạng thái/ghi chú lịch của chính mình.
    - Hội viên: Có quyền cập nhật trạng thái (hủy) hoặc ghi chú lịch của mình.
    - Tự động kiểm tra xung đột trùng lịch của PT khi đổi giờ hoặc đổi PT.
    - Tự động gửi email thông báo qua SMTP tới Hội viên khi Admin/Lễ tân điều phối/dời lịch tập.
    """
    schedule = (
        db.query(WorkoutSchedule)
        .options(
            joinedload(WorkoutSchedule.member),
            joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
        )
        .filter(WorkoutSchedule.id == schedule_id)
        .first()
    )
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lịch tập không tồn tại.",
        )

    user_role_str = str(
        current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    ).strip().lower()

    # Verify permission: Admin & Lễ tân / Staff có toàn quyền sửa/hủy/đổi lịch tập
    allowed_staff = ["admin", "receptionist", "reception", "staff"]
    is_staff = user_role_str in allowed_staff
    if not is_staff and user_role_str not in ["pt", "member"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật lịch này.")

    if user_role_str == "pt":
        trainer = db.query(Trainer).filter(Trainer.user_id == current_user.id).first()
        if not trainer or schedule.pt_id != trainer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật lịch này.")
        if schedule_in.pt_id is not None or schedule_in.start_time is not None or schedule_in.end_time is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HLV chỉ được phép cập nhật trạng thái hoặc ghi chú bài tập.",
            )
    elif user_role_str == "member":
        if schedule.member_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền cập nhật lịch này.")
        if schedule_in.pt_id is not None or schedule_in.start_time is not None or schedule_in.end_time is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hội viên chỉ được phép cập nhật trạng thái hoặc ghi chú.",
            )

    # Calculate effective updated values
    new_start = schedule_in.start_time or schedule.start_time
    new_end = schedule_in.end_time or schedule.end_time
    new_pt_id = schedule_in.pt_id if schedule_in.pt_id is not None else schedule.pt_id
    new_status = schedule_in.status or schedule.status

    # Validate time range
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thời gian kết thúc phải sau thời gian bắt đầu.",
        )

    # Check PT existence if pt_id changed
    if schedule_in.pt_id is not None and schedule_in.pt_id != schedule.pt_id:
        target_pt = db.query(Trainer).filter(Trainer.id == schedule_in.pt_id).first()
        if not target_pt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy Huấn luyện viên được chọn.",
            )

    # Conflict check for Trainer if time or PT changed and status is SCHEDULED
    time_or_pt_changed = (
        (schedule_in.start_time is not None and schedule_in.start_time != schedule.start_time)
        or (schedule_in.end_time is not None and schedule_in.end_time != schedule.end_time)
        or (schedule_in.pt_id is not None and schedule_in.pt_id != schedule.pt_id)
        or (schedule_in.status is not None and schedule_in.status == ScheduleStatus.SCHEDULED and schedule.status != ScheduleStatus.SCHEDULED)
    )

    if time_or_pt_changed and new_status == ScheduleStatus.SCHEDULED:
        conflict = (
            db.query(WorkoutSchedule)
            .filter(
                WorkoutSchedule.id != schedule.id,
                WorkoutSchedule.pt_id == new_pt_id,
                WorkoutSchedule.status == ScheduleStatus.SCHEDULED,
                or_(
                    and_(
                        WorkoutSchedule.start_time <= new_start,
                        WorkoutSchedule.end_time > new_start,
                    ),
                    and_(
                        WorkoutSchedule.start_time < new_end,
                        WorkoutSchedule.end_time >= new_end,
                    ),
                    and_(
                        WorkoutSchedule.start_time >= new_start,
                        WorkoutSchedule.end_time <= new_end,
                    ),
                ),
            )
            .first()
        )
        if conflict:
            c_start = conflict.start_time.strftime("%H:%M") if hasattr(conflict.start_time, "strftime") else str(conflict.start_time)
            c_end = conflict.end_time.strftime("%H:%M") if hasattr(conflict.end_time, "strftime") else str(conflict.end_time)
            c_date = conflict.start_time.strftime("%d/%m/%Y") if hasattr(conflict.start_time, "strftime") else ""
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Huấn luyện viên đã có lịch tập khác từ {c_start} đến {c_end} ngày {c_date}. Vui lòng chọn khung giờ hoặc Huấn luyện viên khác.",
            )

    has_changed = (
        (schedule_in.start_time is not None and schedule_in.start_time != schedule.start_time)
        or (schedule_in.end_time is not None and schedule_in.end_time != schedule.end_time)
        or (schedule_in.pt_id is not None and schedule_in.pt_id != schedule.pt_id)
        or (schedule_in.status is not None and schedule_in.status != schedule.status)
        or (schedule_in.notes is not None and schedule_in.notes != schedule.notes)
    )

    for field, value in schedule_in.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)

    db.commit()
    db.refresh(schedule)

    # Re-fetch with relationships loaded
    schedule = (
        db.query(WorkoutSchedule)
        .options(
            joinedload(WorkoutSchedule.member),
            joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
        )
        .filter(WorkoutSchedule.id == schedule.id)
        .first()
    )

    # If updated by Admin or Receptionist, notify member via SMTP email
    if is_staff and has_changed and schedule.member and schedule.member.email:
        status_labels = {
            ScheduleStatus.SCHEDULED: "Đã lên lịch",
            ScheduleStatus.CHECKED_IN: "Đã điểm danh",
            ScheduleStatus.COMPLETED: "Hoàn thành",
            ScheduleStatus.CANCELLED: "Đã hủy",
            ScheduleStatus.NO_SHOW: "Vắng mặt",
        }
        current_status_label = status_labels.get(
            schedule.status,
            str(schedule.status.value if hasattr(schedule.status, "value") else schedule.status),
        )
        trainer_name = "Chưa chỉ định"
        if schedule.pt and schedule.pt.user:
            trainer_name = schedule.pt.user.full_name
        elif schedule.trainer and schedule.trainer.user:
            trainer_name = schedule.trainer.user.full_name

        dispatcher_role_vn = "Quản trị viên" if user_role_str == "admin" else "Lễ tân"
        dispatcher_name = f"{current_user.full_name} ({dispatcher_role_vn})"

        background_tasks.add_task(
            email_service.send_schedule_update_email,
            to_email=schedule.member.email,
            recipient_name=schedule.member.full_name,
            schedule_id=schedule.id,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            trainer_name=trainer_name,
            status_label=current_status_label,
            dispatcher_name=dispatcher_name,
            notes=schedule.notes,
        )

    return schedule


@router.post("/{schedule_id}/send-reminder")
def send_single_schedule_reminder(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_staff: User = Depends(get_current_staff),
):
    """
    Gửi email nhắc nhở ngay lập tức cho 1 buổi tập cụ thể (Ocean Blue Template):
    - Dành cho Admin và Lễ tân.
    - Cập nhật is_reminder_sent = True khi gửi thành công.
    """
    schedule = (
        db.query(WorkoutSchedule)
        .options(
            joinedload(WorkoutSchedule.member),
            joinedload(WorkoutSchedule.pt).joinedload(Trainer.user),
        )
        .filter(WorkoutSchedule.id == schedule_id)
        .first()
    )
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lịch tập không tồn tại.",
        )

    if not schedule.member or not schedule.member.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hội viên không có email hợp lệ để nhận thông báo.",
        )

    trainer_name = "Chưa chỉ định HLV"
    if schedule.pt and schedule.pt.user:
        trainer_name = schedule.pt.user.full_name
    elif schedule.trainer and schedule.trainer.user:
        trainer_name = schedule.trainer.user.full_name

    success, err = email_service.send_2hour_reminder_email(
        to_email=schedule.member.email,
        recipient_name=schedule.member.full_name,
        schedule_id=schedule.id,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        trainer_name=trainer_name,
        notes=schedule.notes,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi gửi email: {err}",
        )

    schedule.is_reminder_sent = True
    db.commit()

    return {
        "success": True,
        "message": f"Đã gửi email nhắc nhở lịch tập thành công tới {schedule.member.email}!",
        "schedule_id": schedule.id,
    }
