import pytest
from datetime import date, timedelta
from app.models.user import User, UserRole
from app.models.package import Package
from app.models.membership import Membership, MembershipStatus
from app.models.payment import Payment, PaymentStatus
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.trainer import Trainer
from app.core.security import get_password_hash, create_access_token
from app.core.database import SessionLocal


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def setup_test_member(db_session):
    # Ensure a PT exists
    pt_user = db_session.query(User).filter(User.email == "pt_test@gym.com").first()
    if not pt_user:
        pt_user = User(
            full_name="HLV Test PT",
            email="pt_test@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.PT,
            is_verified=True,
        )
        db_session.add(pt_user)
        db_session.commit()
        db_session.refresh(pt_user)

    trainer = db_session.query(Trainer).filter(Trainer.user_id == pt_user.id).first()
    if not trainer:
        trainer = Trainer(
            user_id=pt_user.id,
            bio="HLV Kiểm thử",
            specialization="Giảm mỡ & Tăng cơ",
        )
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)

    # Ensure a package exists
    package = db_session.query(Package).filter(Package.name == "Gói Test Giảm Cân 30 Ngày").first()
    if not package:
        package = Package(
            name="Gói Test Giảm Cân 30 Ngày",
            duration_days=30,
            price=500000,
            category="lose_weight",
            description="Gói tập thử nghiệm",
        )
        db_session.add(package)
        db_session.commit()
        db_session.refresh(package)

    # Create Member
    member = db_session.query(User).filter(User.email == "member_test_sched@gym.com").first()
    if not member:
        member = User(
            full_name="Nguyễn Văn Hội Viên Test",
            email="member_test_sched@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.MEMBER,
            is_verified=True,
        )
        db_session.add(member)
        db_session.commit()
        db_session.refresh(member)

    token = create_access_token(subject=member.id, role="member")
    return member, package, token


def test_auto_generate_schedules_on_renew(client, setup_test_member, db_session):
    member, package, token = setup_test_member

    # Clean existing schedules for this member
    db_session.query(WorkoutSchedule).filter(WorkoutSchedule.member_id == member.id).delete()
    db_session.commit()

    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "package_id": package.id,
        "user_id": member.id,
        "duration_days": 30,
        "custom_amount": 500000,
        "target_weight_kg": 5.0,
        "goal_notes": "Mục tiêu: Giảm 5kg trong 30 ngày",
        "payment_method": "transfer",
    }

    # Call renew package
    response = client.post("/api/v1/payments/renew", json=payload, headers=headers)
    assert response.status_code == 201

    # Verify schedules were auto-generated
    schedules = (
        db_session.query(WorkoutSchedule)
        .filter(WorkoutSchedule.member_id == member.id)
        .all()
    )
    assert len(schedules) >= 12, "Should have generated 12 sessions for 30-day package (3 sessions/week)"

    # Verify goal is attached to notes
    has_goal_note = any("Giảm 5.0kg" in (s.notes or "") or "Giảm" in (s.notes or "") or "Cardio" in (s.notes or "") for s in schedules)
    assert has_goal_note, "Schedules should reflect the goal (Giảm cân / Cardio & Fullbody)"


def test_get_schedules_member_filter(client, setup_test_member, db_session):
    member, package, token = setup_test_member

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/schedules", headers=headers)
    assert response.status_code == 200
    data = response.json()

    # Every schedule returned MUST belong to this member
    for item in data:
        assert item["member_id"] == member.id
        # Check pt or trainer field exists
        assert "pt" in item or "trainer" in item


def test_generate_ai_schedules_endpoint(client, setup_test_member, db_session):
    member, package, token = setup_test_member

    # Delete existing schedules to test AI generation on empty
    db_session.query(WorkoutSchedule).filter(WorkoutSchedule.member_id == member.id).delete()
    db_session.commit()

    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/api/v1/schedules/generate-ai",
        json={"weeks": 2, "goal": "Giảm mỡ toàn thân và siết cơ bụng"},
        headers=headers,
    )
    assert response.status_code == 200
    generated = response.json()
    assert len(generated) > 0, "AI schedule generation should create sessions in DB"

    # Verify in DB
    db_count = (
        db_session.query(WorkoutSchedule)
        .filter(WorkoutSchedule.member_id == member.id)
        .count()
    )
    assert db_count == len(generated)
