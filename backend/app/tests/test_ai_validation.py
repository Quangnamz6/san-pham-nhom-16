import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def auth_headers():
    token = create_access_token(subject=1, role="member")
    return {"Authorization": f"Bearer {token}"}


def test_ai_workout_missing_required_goal(auth_headers):
    """
    Kịch bản kiểm thử: Người dùng gửi yêu cầu thiếu trường bắt buộc 'goal'.
    Hệ thống phải trả về lỗi HTTP 422 Unprocessable Entity kèm chi tiết lỗi validation.
    """
    with TestClient(app) as client:
        invalid_payload = {
            # Thiếu trường goal
            "availability": "4 buổi/tuần",
            "fitness_level": "Mới bắt đầu",
            "medical_notes": "Bình thường"
        }
        response = client.post(
            "/api/v1/ai/recommend-workout",
            json=invalid_payload,
            headers=auth_headers
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error_code"] == "VALIDATION_ERROR"
        assert any("goal" in err["field"] for err in data["details"])


def test_ai_workout_empty_goal(auth_headers):
    """
    Kịch bản kiểm thử: Người dùng gửi trường goal rỗng (chuỗi ngắn hơn min_length).
    """
    with TestClient(app) as client:
        invalid_payload = {
            "goal": "",  # Trống
            "availability": "4 buổi/tuần",
            "fitness_level": "Mới bắt đầu",
            "medical_notes": "Không có"
        }
        response = client.post(
            "/api/v1/ai/recommend-workout",
            json=invalid_payload,
            headers=auth_headers
        )
        assert response.status_code == 422


def test_ai_reminder_negative_missed_sessions(auth_headers):
    """
    Kịch bản kiểm thử: Số buổi bỏ tập bị nhập giá trị âm (vi phạm ràng buộc ge=0).
    """
    admin_token = create_access_token(subject=1, role="admin")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    with TestClient(app) as client:
        invalid_payload = {
            "member_name": "Nguyễn Văn An",
            "package_name": "Gói Gold",
            "expire_date": "2026-11-01",
            "missed_sessions": -5  # Không hợp lệ
        }
        response = client.post(
            "/api/v1/ai/generate-reminder",
            json=invalid_payload,
            headers=admin_headers
        )
        assert response.status_code == 422


def test_ai_safety_guardrail_severe_injury_detection(auth_headers):
    """
    Kịch bản kiểm thử: Người dùng khai báo chấn thương nghiêm trọng
    (chứa từ khóa 'cột sống', 'lưng' hoặc 'ngực').
    Hệ thống phải:
    1. Kích hoạt Safety Guardrail.
    2. Đánh dấu 'requires_pt_consultation' = True.
    3. Trả về cảnh báo yêu cầu chuyển sang tư vấn trực tiếp 1-1 với Huấn luyện viên PT.
    """
    with TestClient(app) as client:
        severe_injury_payload = {
            "goal": "Tập tăng cơ đùi và xô",
            "availability": "3 buổi/tuần",
            "fitness_level": "Mới bắt đầu",
            "medical_notes": "Tôi từng bị đau cột sống và thoát vị đĩa đệm lưng khá nặng"
        }
        response = client.post(
            "/api/v1/ai/recommend-workout",
            json=severe_injury_payload,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Kiểm tra cờ an toàn y tế và nội dung cảnh báo
        assert data["requires_pt_consultation"] is True
        assert "medical_warning" in data
        assert "tư vấn trực tiếp 1-1" in data["medical_warning"].lower()
        assert "cột sống" in data["medical_warning"].lower() or "lưng" in data["medical_warning"].lower()
