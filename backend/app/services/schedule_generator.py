import logging
from datetime import datetime, date, timedelta, time
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.trainer import Trainer
from app.models.package import Package
from app.models.membership import Membership, MembershipStatus
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def _ensure_trainer_available(db: Session) -> List[Trainer]:
    """Đảm bảo hệ thống luôn có ít nhất một Huấn luyện viên (PT) để gán lịch."""
    trainers = db.query(Trainer).all()
    if trainers:
        return trainers

    # Tìm tài khoản có role PT hoặc ADMIN
    pt_user = db.query(User).filter(User.role == UserRole.PT).first()
    if not pt_user:
        pt_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not pt_user:
        pt_user = db.query(User).first()

    if pt_user:
        try:
            new_trainer = Trainer(
                user_id=pt_user.id,
                bio="Huấn luyện viên GymAI chuyên nghiệp, chứng chỉ NASM & Thể hình Quốc tế.",
                specialization="Tăng cơ, Giảm mỡ & Thiết kế Lịch tập AI Cá nhân hóa",
            )
            db.add(new_trainer)
            db.commit()
            db.refresh(new_trainer)
            return [new_trainer]
        except Exception as e:
            db.rollback()
            logger.error(f"Lỗi tạo PT mặc định: {e}")

    return db.query(Trainer).all()


def generate_default_schedules_for_member(
    db: Session,
    member_id: int,
    package: Package,
    duration_days: int = 30,
    target_weight_kg: Optional[float] = None,
    goal_notes: Optional[str] = None,
) -> List[WorkoutSchedule]:
    """
    Tự động sinh các bản ghi Lịch tập (Schedules) cho hội viên khi Đăng ký / Thanh toán gói tập thành công:
    - Phân tích mục tiêu (Tăng cân / Giảm cân / PT cá nhân / Cho Nữ / Sinh viên...).
    - Sinh lịch tập 3-4 buổi/tuần trong khoảng thời gian hiệu lực của gói (30 ngày: 12-14 buổi).
    - Tự động gắn tên bài tập gợi ý phù hợp (Cardio & Fullbody, Upper Body, Lower Body, Core...).
    - Tránh trùng lặp với lịch tập đã có của hội viên.
    """
    try:
        trainers = _ensure_trainer_available(db)
        if not trainers:
            logger.warning("Không tìm thấy PT nào trong hệ thống để gán lịch tập.")
            return []

        # 1. Xác định các chủ đề bài tập theo category / mục tiêu
        category = (package.category or "").lower()
        plan_templates = []

        is_lose = (
            "lose" in category
            or "giam" in category
            or (goal_notes and "giảm" in goal_notes.lower())
        )
        is_gain = (
            "gain" in category
            or "tang" in category
            or (goal_notes and "tăng" in goal_notes.lower())
        )

        if is_lose:
            kg_text = f" (Mục tiêu: Giảm {target_weight_kg}kg)" if target_weight_kg else ""
            plan_templates = [
                f"Buổi 1: Cardio Khởi Động & Fullbody HIIT Đốt Mỡ Thân Trên{kg_text}",
                f"Buổi 2: Upper Body & Core - Ngực, Vai & Siết Cơ Bụng Phẳng Eo{kg_text}",
                f"Buổi 3: Lower Body - Mông Đùi (Squat, Lunge) & Đốt Calo Toàn Diện{kg_text}",
                f"Buổi 4: Cardio LISS - Sức Bền Tim Mạch & Giãn Cơ Phục Hồi Thể Lực{kg_text}",
            ]
        elif is_gain:
            kg_text = f" (Mục tiêu: Tăng {target_weight_kg}kg)" if target_weight_kg else ""
            plan_templates = [
                f"Buổi 1: Upper Body Push - Ngực & Tay Sau (Kích Thích Hypertrophy Tăng Cơ){kg_text}",
                f"Buổi 2: Upper Body Pull - Lưng Xô & Tay Trước (Dày Lưng Phom Chữ V){kg_text}",
                f"Buổi 3: Lower Body - Đùi Trước, Đùi Sau & Bắp Chuối (Tăng Sức Mạnh){kg_text}",
                f"Buổi 4: Shoulders & Core - Vai Toàn Diện & Cơ Bụng Săn Chắc{kg_text}",
            ]
        elif "female" in category or "nu" in category:
            plan_templates = [
                "Buổi 1: Cardio & Fullbody - Khởi Động Tone Up & Thon Gọn Cơ Thể",
                "Buổi 2: Lower Body - Mông Quả Đào & Đùi Sau Thon Gọn (Booty Builder Focus)",
                "Buổi 3: Upper Body - Thon Gọn Lưng - Vai - Bắp Tay & Đốt Mỡ Nách",
                "Buổi 4: Core & Abs - Siết Eo Phẳng Bụng & Giãn Cơ Dẻo Dai Toàn Thân",
            ]
        elif "personal_trainer" in category or "pt" in category:
            plan_templates = [
                "Buổi 1: Đo InBody, Đánh Giá Thể Lực & Phân Tích Tư Thế Vận Động 1:1 Cùng HLV",
                "Buổi 2: Upper Body - Kỹ Thuật Đẩy Ngực Bench Press & Kéo Xô Chuẩn Form 1:1",
                "Buổi 3: Lower Body - Kỹ Thuật Squat & Deadlift Chuyên Sâu 1:1 Cùng HLV",
                "Buổi 4: Cardio & Core - Tối Ưu Mức Tạ, Kiểm Tra Tiến Độ & Tư Vấn Dinh Dưỡng",
            ]
        else:
            plan_templates = [
                "Buổi 1: Cardio & Fullbody - Khởi Động Thích Nghi & Xây Dựng Sức Bền",
                "Buổi 2: Upper Body (Thân Trên) - Ngực, Lưng, Vai & Bắp Tay",
                "Buổi 3: Lower Body (Thân Dưới) - Đùi, Mông & Cơ Bụng Core Săn Chắc",
                "Buổi 4: Cardio HIIT Sức Bền Tim Mạch & Giãn Cơ Toàn Thân",
            ]

        # 2. Tính số buổi tập phù hợp: 3-4 buổi/tuần
        days_to_schedule = min(duration_days, 30)
        if days_to_schedule <= 7:
            total_sessions = 3
        elif days_to_schedule <= 15:
            total_sessions = 6
        elif days_to_schedule <= 30:
            total_sessions = 12
        else:
            total_sessions = 12

        # Lấy các lịch tập hiện có của hội viên để không bị trùng
        existing_schedules = (
            db.query(WorkoutSchedule)
            .filter(
                WorkoutSchedule.member_id == member_id,
                WorkoutSchedule.status == ScheduleStatus.SCHEDULED,
            )
            .all()
        )
        existing_dates = {s.start_time.date() for s in existing_schedules}

        created_schedules = []
        cur_date = date.today() + timedelta(days=1)  # Bắt đầu từ ngày mai
        sessions_created = 0
        template_idx = 0
        pt_idx = 0

        # Lặp tối đa qua các ngày để tìm ngày trống
        for _ in range(days_to_schedule * 2):
            if sessions_created >= total_sessions:
                break

            is_workout_day = False
            if days_to_schedule <= 15:
                # Gói ngắn ngày: Cách ngày (1 ngày tập, 1 ngày nghỉ)
                is_workout_day = (cur_date not in existing_dates)
            else:
                # 3 buổi/tuần: Thứ 2, Thứ 4, Thứ 6 (weekday: 0, 2, 4)
                if cur_date.weekday() in [0, 2, 4] and cur_date not in existing_dates:
                    is_workout_day = True

            if is_workout_day:
                assigned_pt = trainers[pt_idx % len(trainers)]
                # Khung giờ tập mặc định: 18:00 - 19:30
                start_dt = datetime.combine(cur_date, time(18, 0))
                end_dt = datetime.combine(cur_date, time(19, 30))

                note_content = plan_templates[template_idx % len(plan_templates)]

                schedule = WorkoutSchedule(
                    member_id=member_id,
                    pt_id=assigned_pt.id,
                    start_time=start_dt,
                    end_time=end_dt,
                    status=ScheduleStatus.SCHEDULED,
                    notes=note_content,
                )
                db.add(schedule)
                created_schedules.append(schedule)
                existing_dates.add(cur_date)

                sessions_created += 1
                template_idx += 1
                pt_idx += 1

                if days_to_schedule <= 15:
                    cur_date += timedelta(days=2)
                    continue

            cur_date += timedelta(days=1)

        db.commit()
        for s in created_schedules:
            db.refresh(s)

        logger.info(
            f"Đã tự động sinh {len(created_schedules)} buổi tập cho Hội viên #{member_id} theo gói {package.name}."
        )
        return created_schedules

    except Exception as e:
        db.rollback()
        logger.error(f"Lỗi khi tự động sinh lịch tập cho hội viên #{member_id}: {e}")
        return []


async def generate_ai_schedules_for_member(
    db: Session,
    member_id: int,
    weeks: int = 4,
    custom_goal: Optional[str] = None,
) -> List[WorkoutSchedule]:
    """
    Sinh lịch tập tự động bằng AI (1-4 tuần):
    - Đọc thông tin Gói tập hiện tại của Hội viên (mục tiêu tăng/giảm cân, thời hạn gói).
    - Gọi AI Service (recommend_workout) để gợi ý lịch tập chuẩn khoa học.
    - Chuyển đổi kết quả AI thành các bản ghi WorkoutSchedule và lưu trực tiếp vào CSDL.
    """
    try:
        from app.services.ai_service import AIService
        from app.schemas.ai import WorkoutRecommendationRequest

        trainers = _ensure_trainer_available(db)
        if not trainers:
            logger.warning("Không tìm thấy PT nào để gán lịch AI.")
            return []

        # 1. Tìm thông tin Hội viên và Gói tập hiện tại
        member = db.query(User).filter(User.id == member_id).first()
        if not member:
            logger.error(f"Không tìm thấy hội viên #{member_id}")
            return []

        # Lấy Membership đang active hoặc mới nhất
        membership = (
            db.query(Membership)
            .filter(Membership.user_id == member_id)
            .order_by((Membership.status == MembershipStatus.ACTIVE).desc(), Membership.end_date.desc())
            .first()
        )
        package = membership.package if membership else None
        if not package:
            package = db.query(Package).first()

        pkg_name = package.name if package else "Toàn diện GymAI"
        category = (package.category or "").lower() if package else ""

        # 2. Xây dựng mục tiêu tập luyện từ gói tập
        if custom_goal:
            goal_prompt = custom_goal
        elif "lose" in category or "giam" in category:
            goal_prompt = f"Gói {pkg_name}: Giảm mỡ toàn thân, săn chắc vòng eo, đốt calo tối đa"
        elif "gain" in category or "tang" in category:
            goal_prompt = f"Gói {pkg_name}: Tăng cơ nạc (Hypertrophy), dày ngực lưng và tăng sức mạnh tổng thể"
        elif "female" in category or "nu" in category:
            goal_prompt = f"Gói {pkg_name}: Tôn dáng nữ, thon gọn bắp tay eo và phát triển vòng 3 quả đào"
        elif "personal_trainer" in category or "pt" in category:
            goal_prompt = f"Gói {pkg_name}: Huấn luyện chuyên sâu 1-1 cùng HLV, tối ưu phom dáng và dinh dưỡng"
        else:
            goal_prompt = f"Gói {pkg_name}: Nâng cao thể lực, phát triển cơ bắp cân đối và tăng sức bền"

        # 3. Gọi AI Service để sinh giáo án
        ai_req = WorkoutRecommendationRequest(
            goal=goal_prompt,
            availability="3-4 buổi/tuần, mỗi buổi 60-90 phút",
            fitness_level="Cơ bản đến Trung bình",
            medical_notes="Không có tiền sử chấn thương nghiêm trọng",
        )

        ai_plan = await AIService.recommend_workout(db=db, request_data=ai_req, user_id=member_id)

        # 4. Lưu lịch tập AI vào Database
        existing_schedules = (
            db.query(WorkoutSchedule)
            .filter(
                WorkoutSchedule.member_id == member_id,
                WorkoutSchedule.status == ScheduleStatus.SCHEDULED,
            )
            .all()
        )
        existing_dates = {s.start_time.date() for s in existing_schedules}

        created_schedules = []
        cur_date = date.today() + timedelta(days=1)
        pt_idx = 0

        # Lấy danh sách các buổi trong tuần do AI trả về
        ai_days = ai_plan.schedule if (ai_plan and ai_plan.schedule) else []
        if not ai_days:
            # Fallback nếu AI trả rỗng
            return generate_default_schedules_for_member(
                db=db, member_id=member_id, package=package, duration_days=weeks * 7
            )

        num_weeks = max(1, min(weeks, 4))
        target_total_sessions = len(ai_days) * num_weeks

        day_idx = 0
        for _ in range(num_weeks * 14):
            if len(created_schedules) >= target_total_sessions:
                break

            # Chọn các ngày Thứ 2, 4, 6 hoặc Thứ 2, 3, 5, 6
            # Nếu 3 buổi/tuần: [0, 2, 4], nếu 4 buổi/tuần: [0, 1, 3, 4]
            target_weekdays = [0, 1, 3, 4] if len(ai_days) >= 4 else [0, 2, 4]
            if cur_date.weekday() in target_weekdays and cur_date not in existing_dates:
                assigned_pt = trainers[pt_idx % len(trainers)]
                start_dt = datetime.combine(cur_date, time(18, 0))
                end_dt = datetime.combine(cur_date, time(19, 30))

                ai_day_item = ai_days[day_idx % len(ai_days)]
                exercise_summary = ", ".join(
                    [f"{e.name} ({e.sets}x{e.reps})" for e in ai_day_item.exercises[:3]]
                )
                note_content = f"AI [{ai_day_item.focus}]: {exercise_summary}"

                schedule = WorkoutSchedule(
                    member_id=member_id,
                    pt_id=assigned_pt.id,
                    start_time=start_dt,
                    end_time=end_dt,
                    status=ScheduleStatus.SCHEDULED,
                    notes=note_content,
                )
                db.add(schedule)
                created_schedules.append(schedule)
                existing_dates.add(cur_date)

                day_idx += 1
                pt_idx += 1

            cur_date += timedelta(days=1)

        db.commit()
        for s in created_schedules:
            db.refresh(s)

        logger.info(
            f"AI đã tạo thành công {len(created_schedules)} buổi tập cho Hội viên #{member_id} theo gói {package.name}."
        )
        return created_schedules

    except Exception as e:
        db.rollback()
        logger.error(f"Lỗi khi tạo lịch tập AI cho hội viên #{member_id}: {e}")
        return []
