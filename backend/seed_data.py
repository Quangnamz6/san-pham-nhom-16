"""
seed_data.py - Khởi tạo dữ liệu mẫu hoàn chỉnh phục vụ Demo hệ thống Gym AI:
- 1 Admin
- 1 Lễ tân (Receptionist)
- 2 Huấn luyện viên (PT) kèm hồ sơ chuyên môn
- 5 Hội viên (Member) với đa dạng trạng thái (Đang hoạt động, Sắp hết hạn trong 3 ngày, Đã hết hạn)
- 3 Gói tập (Bronze 1 tháng, Silver 3 tháng, Gold 12 tháng)
- Hợp đồng gói tập (Memberships) & Hóa đơn thanh toán (Payments)
- Lịch tập luyện PT (Workout Schedules)
- Lịch sử điểm danh (Attendance check-ins)
"""

import sys
import os
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.package import Package
from app.models.membership import Membership, MembershipStatus
from app.models.trainer import Trainer
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus


def seed():
    print("=========================================================")
    print("🔄 Đang khởi tạo cấu trúc bảng CSDL và nạp dữ liệu mẫu...")
    print("=========================================================")

    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_admin = db.query(User).filter(User.email == "admin@gym.com").first()
        if existing_admin:
            print("⚠️ Dữ liệu mẫu đã tồn tại trong CSDL. Bỏ qua bước nạp lại.")
            return

        today = date.today()
        now = datetime.now(timezone.utc)

        # -----------------------------------------------------------------
        # 1. TẠO TÀI KHOẢN NGƯỜI DÙNG (USERS)
        # -----------------------------------------------------------------
        print("👤 Đang tạo tài khoản người dùng...")

        # 1.1 Admin
        admin = User(
            full_name="Quản Trị Viên Hệ Thống",
            email="admin@gym.com",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            phone="0901000001",
        )
        db.add(admin)

        # 1.2 Receptionist (Lễ tân)
        receptionist = User(
            full_name="Nguyễn Thị Lễ Tân",
            email="letan@gym.com",
            password_hash=get_password_hash("letan123"),
            role=UserRole.RECEPTIONIST,
            phone="0902000002",
        )
        db.add(receptionist)

        # 1.3 Personal Trainers (PT)
        pt1_user = User(
            full_name="Trần Văn Huấn Luyện",
            email="pt1@gym.com",
            password_hash=get_password_hash("pt123"),
            role=UserRole.PT,
            phone="0903000001",
        )
        pt2_user = User(
            full_name="Lê Văn Thể Hình",
            email="pt2@gym.com",
            password_hash=get_password_hash("pt123"),
            role=UserRole.PT,
            phone="0903000002",
        )
        db.add_all([pt1_user, pt2_user])

        # 1.4 Members (5 Hội viên)
        members = [
            User(
                full_name="Nguyễn Văn An",
                email="member1@gym.com",
                password_hash=get_password_hash("member123"),
                role=UserRole.MEMBER,
                phone="0911000001",
            ),
            User(
                full_name="Trần Thị Bích",
                email="member2@gym.com",
                password_hash=get_password_hash("member123"),
                role=UserRole.MEMBER,
                phone="0911000002",
            ),
            User(
                full_name="Lê Hoàng Cường",
                email="member3@gym.com",
                password_hash=get_password_hash("member123"),
                role=UserRole.MEMBER,
                phone="0911000003",
            ),
            User(
                full_name="Phạm Thu Dung",
                email="member4@gym.com",
                password_hash=get_password_hash("member123"),
                role=UserRole.MEMBER,
                phone="0911000004",
            ),
            User(
                full_name="Hoàng Minh Em",
                email="member5@gym.com",
                password_hash=get_password_hash("member123"),
                role=UserRole.MEMBER,
                phone="0911000005",
            ),
        ]
        db.add_all(members)
        db.flush()

        # -----------------------------------------------------------------
        # 2. HỒ SƠ HUẤN LUYỆN VIÊN (TRAINERS)
        # -----------------------------------------------------------------
        print("🏋️ Đang tạo hồ sơ Huấn luyện viên...")
        trainer1 = Trainer(
            user_id=pt1_user.id,
            bio="5 năm kinh nghiệm đào tạo thể hình, cựu vận động viên Men's Physique. Chứng chỉ HLV NASM CPT.",
            specialization="Tăng cơ, Giảm mỡ nhanh, Chỉnh phom bài tập Compound",
        )
        trainer2 = Trainer(
            user_id=pt2_user.id,
            bio="Chuyên gia Strength & Conditioning, đào tạo Powerlifting và phục hồi thể lực sau chấn thương.",
            specialization="Powerlifting, Squat-Bench-Deadlift, Độ dẻo dai cơ bắp",
        )
        db.add_all([trainer1, trainer2])
        db.flush()

        # -----------------------------------------------------------------
        # 3. GÓI TẬP GYM (PACKAGES)
        # -----------------------------------------------------------------
        print("📦 Đang tạo danh mục Gói tập...")
        pkg_bronze = Package(
            name="Gói Khởi Động (Bronze 1 Tháng)",
            duration_days=30,
            price=Decimal("600000.00"),
            description="Tập luyện không giới hạn khung giờ, miễn phí tủ đồ thông minh và phòng tắm nóng lạnh.",
        )
        pkg_silver = Package(
            name="Gói Tiến Bộ (Silver 3 Tháng)",
            duration_days=90,
            price=Decimal("1500000.00"),
            description="Bao gồm quyền lợi gói Bronze + Tặng 2 buổi hướng dẫn cùng Huấn luyện viên cá nhân (PT) + Đo InBody miễn phí hàng tháng.",
        )
        pkg_gold = Package(
            name="Gói Toàn Năng VIP (Gold 12 Tháng)",
            duration_days=365,
            price=Decimal("4800000.00"),
            description="Full quyền lợi cao cấp: Tặng 5 buổi tập PT riêng + Miễn phí phòng xông hơi Sauna + Miễn phí nước uống điện giải mỗi buổi.",
        )
        db.add_all([pkg_bronze, pkg_silver, pkg_gold])
        db.flush()

        # -----------------------------------------------------------------
        # 4. HỢP ĐỒNG GÓI TẬP (MEMBERSHIPS) & THANH TOÁN (PAYMENTS)
        # -----------------------------------------------------------------
        print("💳 Đang liên kết Gói tập và Hóa đơn thanh toán...")

        # Member 1: Gold 12 Tháng (Đang ACTIVE, hết hạn sau 300 ngày)
        mem1 = Membership(
            user_id=members[0].id,
            package_id=pkg_gold.id,
            start_date=today - timedelta(days=65),
            end_date=today + timedelta(days=300),
            status=MembershipStatus.ACTIVE,
        )
        db.add(mem1)
        db.flush()
        pay1 = Payment(
            membership_id=mem1.id,
            amount=pkg_gold.price,
            payment_date=now - timedelta(days=65),
            payment_method=PaymentMethod.BANK_TRANSFER,
            status=PaymentStatus.COMPLETED,
            transaction_code="BANK-M1-GOLD-2026",
        )
        db.add(pay1)

        # Member 2: Silver 3 Tháng (Sắp hết hạn trong 3 NGÀY TỚI -> Thử nghiệm tính năng cảnh báo của Dashboard!)
        mem2 = Membership(
            user_id=members[1].id,
            package_id=pkg_silver.id,
            start_date=today - timedelta(days=87),
            end_date=today + timedelta(days=3),
            status=MembershipStatus.ACTIVE,
        )
        db.add(mem2)
        db.flush()
        pay2 = Payment(
            membership_id=mem2.id,
            amount=pkg_silver.price,
            payment_date=now - timedelta(days=87),
            payment_method=PaymentMethod.MOMO_VNPAY,
            status=PaymentStatus.COMPLETED,
            transaction_code="VNPAY-M2-SILVER-9988",
        )
        db.add(pay2)

        # Member 3: Bronze 1 Tháng (ĐÃ HẾT HẠN 5 ngày trước -> Thử nghiệm tính năng cảnh báo Check-in!)
        mem3 = Membership(
            user_id=members[2].id,
            package_id=pkg_bronze.id,
            start_date=today - timedelta(days=35),
            end_date=today - timedelta(days=5),
            status=MembershipStatus.EXPIRED,
        )
        db.add(mem3)
        db.flush()
        pay3 = Payment(
            membership_id=mem3.id,
            amount=pkg_bronze.price,
            payment_date=now - timedelta(days=35),
            payment_method=PaymentMethod.CASH,
            status=PaymentStatus.COMPLETED,
            transaction_code="CASH-M3-BRONZE-001",
        )
        db.add(pay3)

        # Member 4: Silver 3 Tháng (Đang ACTIVE, hết hạn sau 60 ngày)
        mem4 = Membership(
            user_id=members[3].id,
            package_id=pkg_silver.id,
            start_date=today - timedelta(days=30),
            end_date=today + timedelta(days=60),
            status=MembershipStatus.ACTIVE,
        )
        db.add(mem4)
        db.flush()
        pay4 = Payment(
            membership_id=mem4.id,
            amount=pkg_silver.price,
            payment_date=now - timedelta(days=30),
            payment_method=PaymentMethod.CREDIT_CARD,
            status=PaymentStatus.COMPLETED,
            transaction_code="CC-M4-SILVER-4567",
        )
        db.add(pay4)

        # Member 5: Chưa đăng ký gói (phục vụ lễ tân tạo hợp đồng mới trên giao diện)

        # -----------------------------------------------------------------
        # 5. LỊCH TẬP LUYỆN PT (WORKOUT SCHEDULES)
        # -----------------------------------------------------------------
        print("📅 Đang lập lịch tập luyện cùng PT...")
        # Schedule 1: Member 1 & PT 1 hôm nay lúc 15:00 - 16:30
        schedule1 = WorkoutSchedule(
            member_id=members[0].id,
            pt_id=trainer1.id,
            start_time=datetime.combine(today, datetime.min.time()) + timedelta(hours=15),
            end_time=datetime.combine(today, datetime.min.time()) + timedelta(hours=16, minutes=30),
            status=ScheduleStatus.SCHEDULED,
            notes="Tập ngực & tay sau. Mục tiêu đẩy bench press 80kg 4 sets.",
        )
        # Schedule 2: Member 4 & PT 2 ngày mai lúc 09:00 - 10:30
        schedule2 = WorkoutSchedule(
            member_id=members[3].id,
            pt_id=trainer2.id,
            start_time=datetime.combine(today + timedelta(days=1), datetime.min.time()) + timedelta(hours=9),
            end_time=datetime.combine(today + timedelta(days=1), datetime.min.time()) + timedelta(hours=10, minutes=30),
            status=ScheduleStatus.SCHEDULED,
            notes="Kỹ thuật Deadlift và khởi động khớp háng.",
        )
        db.add_all([schedule1, schedule2])
        db.flush()

        # -----------------------------------------------------------------
        # 6. LỊCH SỬ ĐIỂM DANH CHECK-IN (ATTENDANCE)
        # -----------------------------------------------------------------
        print("⏱️ Đang ghi nhận nhật ký Check-in...")
        attendances = [
            # Member 1 điểm danh sáng nay lúc 08:30
            Attendance(
                member_id=members[0].id,
                schedule_id=None,
                check_in_time=datetime.combine(today, datetime.min.time()) + timedelta(hours=8, minutes=30),
                status=AttendanceStatus.PRESENT,
            ),
            # Member 2 điểm danh sáng nay lúc 09:15
            Attendance(
                member_id=members[1].id,
                schedule_id=None,
                check_in_time=datetime.combine(today, datetime.min.time()) + timedelta(hours=9, minutes=15),
                status=AttendanceStatus.PRESENT,
            ),
            # Member 4 điểm danh chiều hôm qua lúc 17:00
            Attendance(
                member_id=members[3].id,
                schedule_id=None,
                check_in_time=datetime.combine(today - timedelta(days=1), datetime.min.time()) + timedelta(hours=17),
                status=AttendanceStatus.PRESENT,
            ),
        ]
        db.add_all(attendances)

        db.commit()

        print("=========================================================")
        print("✅ KHỞI TẠO DỮ LIỆU MẪU THÀNH CÔNG!")
        print("=========================================================")
        print("📋 DANH SÁCH TÀI KHOẢN DÙNG THỬ (DEMO ACCOUNTS):")
        print("1. 👑 Admin (Quản trị):")
        print("   - Email: admin@gym.com")
        print("   - Mật khẩu: admin123")
        print("2. 🛎️ Lễ tân (Receptionist):")
        print("   - Email: letan@gym.com")
        print("   - Mật khẩu: letan123")
        print("3. 🏋️ Huấn luyện viên (PT):")
        print("   - PT 1: pt1@gym.com  | Mật khẩu: pt123")
        print("   - PT 2: pt2@gym.com  | Mật khẩu: pt123")
        print("4. 🏃 Hội viên (Members):")
        print("   - Member 1 (Gói VIP Gold):   member1@gym.com | Mật khẩu: member123")
        print("   - Member 2 (Sắp hết hạn 3d): member2@gym.com | Mật khẩu: member123")
        print("   - Member 3 (Đã hết hạn 5d):  member3@gym.com | Mật khẩu: member123")
        print("   - Member 4 (Gói Silver):     member4@gym.com | Mật khẩu: member123")
        print("   - Member 5 (Chưa có gói):    member5@gym.com | Mật khẩu: member123")
        print("=========================================================")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi nạp dữ liệu: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
