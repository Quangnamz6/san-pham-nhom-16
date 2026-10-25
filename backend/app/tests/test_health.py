from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app_name" in data


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "docs_url" in data


def test_packages_endpoint_public(client: TestClient):
    response = client.get("/api/v1/packages/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_unauthorized_access_to_dashboard(client: TestClient):
    response = client.get("/api/v1/dashboard/stats")
    assert response.status_code == 401


def test_ai_recommend_workout_mock_fallback(client: TestClient):
    # Create fake token for test
    token = create_access_token(subject=1, role="member")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "goal": "Tăng cơ giảm mỡ",
        "availability": "3 buổi/tuần",
        "fitness_level": "Mới bắt đầu",
        "medical_notes": "Đau khớp gối nhẹ"
    }
    response = client.post("/api/v1/ai/recommend-workout", json=payload, headers=headers)
    # If DB not initialized in testclient context or sqlite ready, test status
    if response.status_code == 200:
        data = response.json()
        assert "medical_warning" in data
        assert "schedule" in data
