import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.package import Package


@pytest.fixture(scope="module")
def admin_and_member_tokens():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        member = db.query(User).filter(User.role == UserRole.MEMBER).first()
        
        admin_id = admin.id if admin else 9999
        member_id = member.id if member else 9998

        admin_token = create_access_token(subject=admin_id, role="admin")
        member_token = create_access_token(subject=member_id, role="member")
        return {
            "admin": {"Authorization": f"Bearer {admin_token}"},
            "member": {"Authorization": f"Bearer {member_token}"},
        }
    finally:
        db.close()


def test_get_packages_public(client: TestClient):
    response = client.get("/api/v1/packages")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_package_requires_admin(client: TestClient, admin_and_member_tokens):
    pkg_payload = {
        "name": "Gói Test Phân Quyền",
        "duration_days": 30,
        "price": 500000,
        "category": "male",
        "badge": "Test",
        "description": "Gói dùng để test",
        "benefits": "Tập thoải mái; Nước uống",
        "commitments": "Cam kết test đạt chuẩn",
        "featured": False,
    }

    # 1. No token -> 401
    res_no_auth = client.post("/api/v1/packages", json=pkg_payload)
    assert res_no_auth.status_code == 401

    # 2. Member token -> 403
    res_member = client.post(
        "/api/v1/packages",
        json=pkg_payload,
        headers=admin_and_member_tokens["member"],
    )
    assert res_member.status_code == 403


def test_crud_package_admin_lifecycle(client: TestClient, admin_and_member_tokens):
    headers = admin_and_member_tokens["admin"]

    # 1. Create Package
    create_payload = {
        "name": "Gói Giảm Cân Cấp Tốc 1 Tháng (Test)",
        "duration_days": 30,
        "price": 999000,
        "category": "lose_weight",
        "badge": "Giảm Cân",
        "description": "Lộ trình đốt mỡ chuyên sâu",
        "benefits": "Huấn luyện viên kèm riêng; Cân đo InBody",
        "commitments": "Cam kết giảm 2-4kg",
        "featured": True,
    }
    create_res = client.post("/api/v1/packages", json=create_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    created_pkg = create_res.json()
    pkg_id = created_pkg["id"]
    assert created_pkg["name"] == create_payload["name"]
    assert float(created_pkg["price"]) == 999000.0

    # 2. Update Package
    update_payload = {
        "name": "Gói Giảm Cân Cấp Tốc 1 Tháng (Đã Update)",
        "price": 1200000,
        "commitments": "Cam kết giảm 3-5kg",
    }
    update_res = client.put(f"/api/v1/packages/{pkg_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_pkg = update_res.json()
    assert updated_pkg["name"] == update_payload["name"]
    assert float(updated_pkg["price"]) == 1200000.0

    # 3. Delete Package
    del_res = client.delete(f"/api/v1/packages/{pkg_id}", headers=headers)
    assert del_res.status_code == 204

    # 4. Verify Not Found
    get_res = client.get(f"/api/v1/packages/{pkg_id}")
    assert get_res.status_code == 404
