import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User

client = TestClient(app)


def test_register_and_verify_otp_flow():
    test_email = "test_otp_user@example.com"

    # Cleanup if exists
    db = SessionLocal()
    existing = db.query(User).filter(User.email == test_email).first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()

    # 1. Register with Mock email sending
    with patch("app.services.email_service.email_service.send_otp_email", return_value=(True, None)):
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_email,
                "password": "password123",
                "full_name": "Test OTP User",
                "phone": "0988776655",
                "role": "member",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == test_email
        assert data["is_verified"] is False
        assert data["requires_otp"] is True

    # 2. Retrieve generated OTP code from DB
    db = SessionLocal()
    user = db.query(User).filter(User.email == test_email).first()
    assert user is not None
    assert user.is_verified is False
    assert user.otp_code is not None
    saved_otp = user.otp_code
    db.close()

    # 3. Test Invalid OTP
    invalid_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": test_email, "otp_code": "000000"},
    )
    assert invalid_res.status_code == 400
    res_json = invalid_res.json()
    err_msg = res_json.get("message") or res_json.get("detail", "")
    assert "không chính xác" in err_msg

    # 4. Test Valid OTP verification
    valid_res = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": test_email, "otp_code": saved_otp},
    )
    assert valid_res.status_code == 200
    token_data = valid_res.json()
    assert "access_token" in token_data
    assert token_data["user"]["is_verified"] is True

    # 5. Verify User in DB is updated
    db = SessionLocal()
    user = db.query(User).filter(User.email == test_email).first()
    assert user.is_verified is True
    assert user.otp_code is None
    db.close()

    # 6. Test Resend OTP on already verified user
    resend_res = client.post(
        "/api/v1/auth/resend-otp",
        json={"email": test_email},
    )
    assert resend_res.status_code == 200
    assert "đã được xác thực trước đó" in resend_res.json()["message"]


def test_login_blocked_for_unverified_user():
    unverified_email = "unverified_test@example.com"

    db = SessionLocal()
    existing = db.query(User).filter(User.email == unverified_email).first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()

    # Register user
    with patch("app.services.email_service.email_service.send_otp_email", return_value=(True, None)):
        client.post(
            "/api/v1/auth/register",
            json={
                "email": unverified_email,
                "password": "password123",
                "full_name": "Unverified User",
                "role": "member",
            },
        )

    # Attempt login before verifying OTP -> Should return 403 Forbidden
    login_res = client.post(
        "/api/v1/auth/login/json",
        json={"email": unverified_email, "password": "password123"},
    )
    assert login_res.status_code == 403
    res_json = login_res.json()
    err_msg = res_json.get("message") or res_json.get("detail", "")
    assert "chưa được xác thực email" in err_msg
