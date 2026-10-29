import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.trainer import Trainer
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.models.membership import Membership, MembershipStatus
from app.models.package import Package
from app.core.security import get_password_hash, create_access_token
from app.core.database import SessionLocal


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_rbac_checkin_and_schedules_full_flow(client: TestClient, db_session: Session):
    # 1. Setup users with various role string formats
    admin = db_session.query(User).filter(User.email == "test_rbac_admin@gym.com").first()
    if not admin:
        admin = User(
            full_name="Admin RBAC Test",
            email="test_rbac_admin@gym.com",
            password_hash=get_password_hash("password123"),
            role="ADMIN",  # Note uppercase role to test normalization
            is_verified=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    receptionist = db_session.query(User).filter(User.email == "test_rbac_recept@gym.com").first()
    if not receptionist:
        receptionist = User(
            full_name="Recept RBAC Test",
            email="test_rbac_recept@gym.com",
            password_hash=get_password_hash("password123"),
            role="RECEPTIONIST",  # Note uppercase
            is_verified=True,
        )
        db_session.add(receptionist)
        db_session.commit()
        db_session.refresh(receptionist)

    staff = db_session.query(User).filter(User.email == "test_rbac_staff@gym.com").first()
    if not staff:
        staff = User(
            full_name="Staff RBAC Test",
            email="test_rbac_staff@gym.com",
            password_hash=get_password_hash("password123"),
            role="staff",  # Note staff role
            is_verified=True,
        )
        db_session.add(staff)
        db_session.commit()
        db_session.refresh(staff)

    member = db_session.query(User).filter(User.email == "test_rbac_member@gym.com").first()
    if not member:
        member = User(
            full_name="Member RBAC Test",
            email="test_rbac_member@gym.com",
            password_hash=get_password_hash("password123"),
            role="member",
            phone="0999888777",
            is_verified=True,
        )
        db_session.add(member)
        db_session.commit()
        db_session.refresh(member)

    pt_user = db_session.query(User).filter(User.email == "test_rbac_pt@gym.com").first()
    if not pt_user:
        pt_user = User(
            full_name="PT RBAC Test",
            email="test_rbac_pt@gym.com",
            password_hash=get_password_hash("password123"),
            role="PT",
            is_verified=True,
        )
        db_session.add(pt_user)
        db_session.commit()
        db_session.refresh(pt_user)

    trainer = db_session.query(Trainer).filter(Trainer.user_id == pt_user.id).first()
    if not trainer:
        trainer = Trainer(user_id=pt_user.id, bio="Test PT", specialization="Fitness")
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)

    # Clean old schedules
    db_session.query(WorkoutSchedule).filter(
        (WorkoutSchedule.member_id == member.id) | (WorkoutSchedule.pt_id == trainer.id)
    ).delete()
    db_session.commit()

    # Tokens
    admin_token = create_access_token(subject=admin.id, role="admin")
    recept_token = create_access_token(subject=receptionist.id, role="receptionist")
    staff_token = create_access_token(subject=staff.id, role="staff")
    member_token = create_access_token(subject=member.id, role="member")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    recept_headers = {"Authorization": f"Bearer {recept_token}"}
    staff_headers = {"Authorization": f"Bearer {staff_token}"}
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # 2. Check /auth/refresh endpoint
    refresh_res = client.post("/api/v1/auth/refresh", headers=recept_headers)
    assert refresh_res.status_code == 200, f"Refresh failed: {refresh_res.text}"
    refresh_data = refresh_res.json()
    assert refresh_data["role"] == "receptionist"
    assert "access_token" in refresh_data

    # 3. Receptionist books a new schedule for Member (POST /api/v1/schedules)
    now = datetime.now(timezone.utc) + timedelta(days=2)
    start_time = now.replace(hour=10, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=1)

    book_payload = {
        "member_id": member.id,
        "pt_id": trainer.id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "status": "scheduled",
        "notes": "Lịch tập do Lễ tân tạo",
    }
    book_res = client.post("/api/v1/schedules", json=book_payload, headers=recept_headers)
    assert book_res.status_code == 201, f"Booking schedule failed: {book_res.text}"
    sched_id = book_res.json()["id"]

    # 4. Staff edits the schedule (PUT /api/v1/schedules/{id})
    edit_payload = {
        "notes": "Staff đã cập nhật ghi chú và dời 30 phút",
        "start_time": (start_time + timedelta(minutes=30)).isoformat(),
        "end_time": (end_time + timedelta(minutes=30)).isoformat(),
    }
    edit_res = client.put(f"/api/v1/schedules/{sched_id}", json=edit_payload, headers=staff_headers)
    assert edit_res.status_code == 200, f"Staff update failed: {edit_res.text}"
    assert "Staff đã cập nhật" in edit_res.json()["notes"]

    # 5. Fast Check-in at quầy lễ tân (POST /api/v1/attendance/check-in) using Receptionist token
    checkin_payload = {
        "member_id": member.id,
        "schedule_id": sched_id,
    }
    checkin_res = client.post("/api/v1/attendance/check-in", json=checkin_payload, headers=recept_headers)
    assert checkin_res.status_code == 201, f"Attendance check-in failed: {checkin_res.text}"
    assert checkin_res.json()["member_id"] == member.id

    # Verify schedule status is updated to CHECKED_IN
    db_session.expire_all()
    updated_sched = db_session.query(WorkoutSchedule).filter(WorkoutSchedule.id == sched_id).first()
    assert updated_sched.status == ScheduleStatus.CHECKED_IN

    # 6. Check-in directly via schedules check-in endpoint (POST /api/v1/schedules/check-in)
    sched_checkin_res = client.post(
        "/api/v1/schedules/check-in",
        json={"phone": member.phone, "schedule_id": sched_id},
        headers=admin_headers,
    )
    assert sched_checkin_res.status_code == 200, f"Schedules check-in failed: {sched_checkin_res.text}"
    assert sched_checkin_res.json()["success"] is True

    # 7. Check-in directly via schedule ID route (PUT /api/v1/schedules/{id}/check-in)
    put_checkin_res = client.put(f"/api/v1/schedules/{sched_id}/check-in", headers=staff_headers)
    assert put_checkin_res.status_code == 200, f"PUT schedule checkin failed: {put_checkin_res.text}"
    assert put_checkin_res.json()["status"] == "checked_in"

    # 8. Check that Member calling staff check-in is rejected 403
    member_checkin_res = client.post("/api/v1/attendance/check-in", json=checkin_payload, headers=member_headers)
    assert member_checkin_res.status_code == 403
