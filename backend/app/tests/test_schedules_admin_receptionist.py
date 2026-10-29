from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.user import User, UserRole
from app.models.trainer import Trainer
from app.models.workout_schedule import WorkoutSchedule, ScheduleStatus
from app.core.security import get_password_hash, create_access_token


import pytest
from app.core.database import SessionLocal


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_schedules_all_rbac_and_dispatch(client: TestClient, db_session: Session):
    # 1. Setup Admin, Receptionist, Member and PT users
    admin_user = db_session.query(User).filter(User.email == "admin_sched_test@gym.com").first()
    if not admin_user:
        admin_user = User(
            full_name="Admin Sched Test",
            email="admin_sched_test@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.ADMIN,
            is_verified=True,
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)

    recept_user = db_session.query(User).filter(User.email == "recept_sched_test@gym.com").first()
    if not recept_user:
        recept_user = User(
            full_name="Le Tan Sched Test",
            email="recept_sched_test@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.RECEPTIONIST,
            is_verified=True,
        )
        db_session.add(recept_user)
        db_session.commit()
        db_session.refresh(recept_user)

    member_user = db_session.query(User).filter(User.email == "member_sched_test@gym.com").first()
    if not member_user:
        member_user = User(
            full_name="Hoi Vien Sched Test",
            email="member_sched_test@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.MEMBER,
            phone="0911222333",
            is_verified=True,
        )
        db_session.add(member_user)
        db_session.commit()
        db_session.refresh(member_user)

    pt_user1 = db_session.query(User).filter(User.email == "pt1_sched_test@gym.com").first()
    if not pt_user1:
        pt_user1 = User(
            full_name="PT 1 Sched Test",
            email="pt1_sched_test@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.PT,
            is_verified=True,
        )
        db_session.add(pt_user1)
        db_session.commit()
        db_session.refresh(pt_user1)

    pt1 = db_session.query(Trainer).filter(Trainer.user_id == pt_user1.id).first()
    if not pt1:
        pt1 = Trainer(user_id=pt_user1.id, bio="PT 1 Bio", specialization="Cardio")
        db_session.add(pt1)
        db_session.commit()
        db_session.refresh(pt1)

    pt_user2 = db_session.query(User).filter(User.email == "pt2_sched_test@gym.com").first()
    if not pt_user2:
        pt_user2 = User(
            full_name="PT 2 Sched Test",
            email="pt2_sched_test@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.PT,
            is_verified=True,
        )
        db_session.add(pt_user2)
        db_session.commit()
        db_session.refresh(pt_user2)

    pt2 = db_session.query(Trainer).filter(Trainer.user_id == pt_user2.id).first()
    if not pt2:
        pt2 = Trainer(user_id=pt_user2.id, bio="PT 2 Bio", specialization="Gym & Strength")
        db_session.add(pt2)
        db_session.commit()
        db_session.refresh(pt2)

    # Clean existing test schedules for this member
    db_session.query(WorkoutSchedule).filter(WorkoutSchedule.member_id == member_user.id).delete()
    db_session.commit()

    # Create a schedule
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=2)
    sched = WorkoutSchedule(
        member_id=member_user.id,
        pt_id=pt1.id,
        start_time=now,
        end_time=now + timedelta(hours=1),
        status=ScheduleStatus.SCHEDULED,
        notes="Lịch ban đầu",
    )
    db_session.add(sched)
    db_session.commit()
    db_session.refresh(sched)

    # 2. Member tries to access GET /api/v1/schedules/all -> 403 Forbidden
    member_token = create_access_token(subject=member_user.id, role="member")
    resp_member = client.get(
        "/api/v1/schedules/all",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert resp_member.status_code == 403

    # 3. Receptionist accesses GET /api/v1/schedules/all -> 200 OK
    recept_token = create_access_token(subject=recept_user.id, role="receptionist")
    resp_recept = client.get(
        "/api/v1/schedules/all",
        headers={"Authorization": f"Bearer {recept_token}"},
    )
    assert resp_recept.status_code == 200
    items = resp_recept.json()
    assert len(items) >= 1
    found = any(s["id"] == sched.id for s in items)
    assert found is True

    # 4. Search filter in GET /api/v1/schedules/all
    resp_search = client.get(
        f"/api/v1/schedules/all?search={member_user.full_name[:6]}",
        headers={"Authorization": f"Bearer {recept_token}"},
    )
    assert resp_search.status_code == 200
    assert any(s["id"] == sched.id for s in resp_search.json())

    # 5. Receptionist updates schedule via PUT /api/v1/schedules/{id}
    # Reschedule: change time slot, change PT to PT 2, change note, change status
    new_start = now + timedelta(hours=3)
    new_end = now + timedelta(hours=4)
    update_payload = {
        "pt_id": pt2.id,
        "start_time": new_start.isoformat(),
        "end_time": new_end.isoformat(),
        "status": "scheduled",
        "notes": "Lễ tân điều phối sang PT 2 theo yêu cầu hội viên",
    }

    resp_update = client.put(
        f"/api/v1/schedules/{sched.id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {recept_token}"},
    )
    assert resp_update.status_code == 200
    updated_data = resp_update.json()
    assert updated_data["pt_id"] == pt2.id
    assert "PT 2" in (updated_data["trainer"]["user"]["full_name"] if updated_data.get("trainer") else "")
    assert updated_data["notes"] == "Lễ tân điều phối sang PT 2 theo yêu cầu hội viên"

    # 6. Test conflict prevention on PT rescheduling:
    # Create another schedule for PT 2 at the exact same new_start time
    conflict_member = db_session.query(User).filter(User.email == "other_member@gym.com").first()
    if not conflict_member:
        conflict_member = User(
            full_name="Other Member",
            email="other_member@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.MEMBER,
            is_verified=True,
        )
        db_session.add(conflict_member)
        db_session.commit()
        db_session.refresh(conflict_member)

    conflict_sched = WorkoutSchedule(
        member_id=conflict_member.id,
        pt_id=pt1.id,
        start_time=now + timedelta(days=5),
        end_time=now + timedelta(days=5, hours=1),
        status=ScheduleStatus.SCHEDULED,
        notes="Lịch cố định của PT 1",
    )
    db_session.add(conflict_sched)
    db_session.commit()
    db_session.refresh(conflict_sched)

    # Now attempt to reschedule sched to PT 1 at conflict_sched's time
    resp_conflict = client.put(
        f"/api/v1/schedules/{sched.id}",
        json={
            "pt_id": pt1.id,
            "start_time": conflict_sched.start_time.isoformat(),
            "end_time": conflict_sched.end_time.isoformat(),
            "status": "scheduled",
        },
        headers={"Authorization": f"Bearer {recept_token}"},
    )
    assert resp_conflict.status_code == 409
    error_msg = resp_conflict.json().get("message") or resp_conflict.json().get("detail", "")
    assert "Huấn luyện viên đã có lịch tập khác" in error_msg


def test_2hour_schedule_reminder_service_and_endpoints(client: TestClient, db_session: Session):
    from app.services.reminder_service import scan_and_send_schedule_reminders

    # Setup member
    member = db_session.query(User).filter(User.email == "remind_test_member@gym.com").first()
    if not member:
        member = User(
            full_name="Hội Viên Nhắc Lịch",
            email="remind_test_member@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.MEMBER,
            is_verified=True,
        )
        db_session.add(member)
        db_session.commit()
        db_session.refresh(member)

    # Setup PT
    pt_user = db_session.query(User).filter(User.email == "remind_test_pt@gym.com").first()
    if not pt_user:
        pt_user = User(
            full_name="HLV Nhắc Lịch",
            email="remind_test_pt@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.PT,
            is_verified=True,
        )
        db_session.add(pt_user)
        db_session.commit()
        db_session.refresh(pt_user)

    trainer = db_session.query(Trainer).filter(Trainer.user_id == pt_user.id).first()
    if not trainer:
        trainer = Trainer(user_id=pt_user.id, bio="PT Bio", specialization="Cardio & Hiit")
        db_session.add(trainer)
        db_session.commit()
        db_session.refresh(trainer)

    # Clean old test schedules
    db_session.query(WorkoutSchedule).filter(WorkoutSchedule.member_id == member.id).delete()
    db_session.commit()

    # Schedule 1: Exactly in 120 minutes (within 115 - 125 min window)
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    sched_2h = WorkoutSchedule(
        member_id=member.id,
        pt_id=trainer.id,
        start_time=now + timedelta(minutes=120),
        end_time=now + timedelta(minutes=180),
        status=ScheduleStatus.SCHEDULED,
        notes="Tập cơ vai và Cardio",
        is_reminder_sent=False,
    )
    # Schedule 2: In 5 hours (outside 115 - 125 min window)
    sched_5h = WorkoutSchedule(
        member_id=member.id,
        pt_id=trainer.id,
        start_time=now + timedelta(hours=5),
        end_time=now + timedelta(hours=6),
        status=ScheduleStatus.SCHEDULED,
        notes="Tập chân và bụng",
        is_reminder_sent=False,
    )
    db_session.add_all([sched_2h, sched_5h])
    db_session.commit()
    db_session.refresh(sched_2h)
    db_session.refresh(sched_5h)

    # 1. Run reminder scanner
    results = scan_and_send_schedule_reminders(db=db_session)
    sent_ids = [r[0] for r in results if r[2] is True]

    assert sched_2h.id in sent_ids
    assert sched_5h.id not in sent_ids

    # Verify db status
    db_session.refresh(sched_2h)
    db_session.refresh(sched_5h)
    assert sched_2h.is_reminder_sent is True
    assert sched_5h.is_reminder_sent is False

    # 2. Run scanner again -> should not re-send because is_reminder_sent is True
    results_second = scan_and_send_schedule_reminders(db=db_session)
    assert len(results_second) == 0

    # 3. Test API endpoint POST /api/v1/schedules/trigger-reminders
    recept = db_session.query(User).filter(User.role == UserRole.RECEPTIONIST).first()
    recept_token = create_access_token(subject=recept.id, role="receptionist")

    resp_trigger = client.post(
        "/api/v1/schedules/trigger-reminders",
        headers={"Authorization": f"Bearer {recept_token}"},
    )
    assert resp_trigger.status_code == 200
    assert resp_trigger.json()["success"] is True

    # 4. Test API endpoint POST /api/v1/schedules/{id}/send-reminder for sched_5h
    resp_single = client.post(
        f"/api/v1/schedules/{sched_5h.id}/send-reminder",
        headers={"Authorization": f"Bearer {recept_token}"},
    )
    assert resp_single.status_code == 200
    assert resp_single.json()["success"] is True

    db_session.refresh(sched_5h)
    assert sched_5h.is_reminder_sent is True

