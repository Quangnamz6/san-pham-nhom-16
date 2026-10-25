import pytest
import asyncio
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token


@pytest.fixture
def auth_headers():
    token = create_access_token(subject=1, role="admin")
    return {"Authorization": f"Bearer {token}"}


def test_ai_recommend_workout_timeout_fallback(auth_headers):
    """
    Kịch bản kiểm thử: API AI gặp lỗi Timeout khi gọi LLM.
    Hệ thống phải:
    1. Bắt lỗi Timeout an toàn, không làm gián đoạn máy chủ (không trả về 500).
    2. Tự động kích hoạt Fallback Engine chuẩn y khoa trả về kết quả hợp lệ (HTTP 200).
    3. Đảm bảo cấu trúc JSON đầy đủ các trường (plan_title, medical_warning, schedule...).
    """
    with TestClient(app) as client:
        # Mock hàm _call_llm_json để mô phỏng Timeout (trả về None do timeout)
        with patch("app.services.ai_service.AIService._call_llm_json", return_value=(None, 0)):
            payload = {
                "goal": "Tăng cơ bắp tay và vai",
                "availability": "3 buổi/tuần",
                "fitness_level": "Mới bắt đầu",
                "medical_notes": "Sức khỏe bình thường"
            }
            response = client.post(
                "/api/v1/ai/recommend-workout",
                json=payload,
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()

            # Kiểm tra định dạng JSON Schema chuẩn
            assert "plan_title" in data
            assert "medical_warning" in data
            assert "schedule" in data
            assert len(data["schedule"]) > 0
            assert "recovery_tips" in data
            assert data["requires_pt_consultation"] is False


def test_ai_generate_reminder_timeout_fallback(auth_headers):
    """
    Kiểm thử kịch bản sinh tin nhắn CSKH gặp lỗi Timeout.
    Hệ thống tự động kích hoạt mẫu tin nhắn fallback lịch sự.
    """
    with TestClient(app) as client:
        with patch("app.services.ai_service.AIService._call_llm_json", return_value=(None, 0)):
            payload = {
                "member_name": "Trần Thị Bích",
                "package_name": "Gói Silver 3 Tháng",
                "expire_date": "2026-10-30",
                "missed_sessions": 2
            }
            response = client.post(
                "/api/v1/ai/generate-reminder",
                json=payload,
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "call_to_action" in data
            assert "Trần Thị Bích" in data["message"]
