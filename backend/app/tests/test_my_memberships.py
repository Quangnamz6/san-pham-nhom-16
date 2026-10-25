import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User, UserRole
from app.models.package import Package
from app.models.membership import Membership, MembershipStatus
from app.core.security import get_password_hash, create_access_token
from app.core.database import SessionLocal

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def setup_membership_fixture(db_session):
    # Setup test member 1
    user1 = db_session.query(User).filter(User.email == "member_test1@gym.com").first()
    if not user1:
        user1 = User(
            full_name="Nguyễn Văn Hội Viên 1",
            email="member_test1@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.MEMBER,
            is_verified=True,
        )
        db_session.add(user1)
        db_session.commit()
        db_session.refresh(user1)

    # Setup test member 2
    user2 = db_session.query(User).filter(User.email == "member_test2@gym.com").first()
    if not user2:
        user2 = User(
            full_name="Trần Thị Hội Viên 2",
            email="member_test2@gym.com",
            password_hash=get_password_hash("password123"),
            role=UserRole.MEMBER,
            is_verified=True,
        )
        db_session.add(user2)
        db_session.commit()
        db_session.refresh(user2)

    # Setup package
    pkg = db_session.query(Package).filter(Package.name == "Gold 12 Tháng Test").first()
    if not pkg:
        pkg = Package(
            name="Gold 12 Tháng Test",
            duration_days=365,
            price=6000000,
            category="lose_weight",
            description="Gói tập cao cấp 12 tháng",
        )
        db_session.add(pkg)
        db_session.commit()
        db_session.refresh(pkg)

    # Create membership for user1
    today = date.today()
    mem = (
        db_session.query(Membership)
        .filter(Membership.user_id == user1.id, Membership.package_id == pkg.id)
        .first()
    )
    if not mem:
        mem = Membership(
            user_id=user1.id,
            package_id=pkg.id,
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=20),
            status=MembershipStatus.ACTIVE,
            goal_notes="Giảm 4kg mỡ",
            target_weight_kg=4.0,
        )
        db_session.add(mem)
        db_session.commit()
        db_session.refresh(mem)

    token1 = create_access_token(subject=user1.id, role=user1.role.value)
    token2 = create_access_token(subject=user2.id, role=user2.role.value)

    return {
        "user1": user1,
        "user2": user2,
        "package": pkg,
        "membership": mem,
        "token1": token1,
        "token2": token2,
    }


def test_get_my_memberships(setup_membership_fixture):
    token1 = setup_membership_fixture["token1"]
    resp = client.get(
        "/api/v1/memberships/my-memberships",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    found = [m for m in data if m["id"] == setup_membership_fixture["membership"].id]
    assert len(found) == 1
    assert found[0]["status"] == "active"
    assert found[0]["days_left"] is not None
    assert found[0]["days_left"] >= 0
    assert found[0]["package"]["name"] == "Gold 12 Tháng Test"


def test_renew_membership_success(setup_membership_fixture):
    token1 = setup_membership_fixture["token1"]
    mem = setup_membership_fixture["membership"]
    old_end_date = mem.end_date

    resp = client.post(
        f"/api/v1/memberships/{mem.id}/renew",
        headers={"Authorization": f"Bearer {token1}"},
        json={
            "duration_days": 30,
            "goal_notes": "Giảm 6kg mỡ trong 30 ngày tới",
            "target_weight_kg": 6.0,
            "payment_method": "transfer",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["target_weight_kg"] == 6.0
    assert "Giảm 6kg mỡ" in data["goal_notes"]
    # Verify end_date extended
    expected_new_end = (old_end_date + timedelta(days=30)).isoformat()
    assert data["end_date"] == expected_new_end


def test_renew_membership_unauthorized_forbidden(setup_membership_fixture):
    token2 = setup_membership_fixture["token2"]
    mem_user1 = setup_membership_fixture["membership"]

    # user2 attempts to renew user1's membership
    resp = client.post(
        f"/api/v1/memberships/{mem_user1.id}/renew",
        headers={"Authorization": f"Bearer {token2}"},
        json={"duration_days": 15},
    )
    assert resp.status_code == 403
