import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_ai_chat_beginner_package_recommendation(client: TestClient):
    payload = {
        "message": "Tôi là người mới bắt đầu, muốn tìm gói tập nhẹ nhàng",
        "chat_history": []
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert data["intent"] == "package_consultation"
    assert len(data["recommended_packages"]) > 0
    # Should recommend Bronze / beginner package
    pkg_names = [p["name"] for p in data["recommended_packages"]]
    assert any("khởi động" in name.lower() or "bronze" in name.lower() for name in pkg_names)


def test_ai_chat_female_package_recommendation(client: TestClient):
    payload = {
        "message": "Gói tập nào dành cho nữ muốn săn chắc vóc dáng?",
        "chat_history": []
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "package_consultation"
    assert len(data["recommended_packages"]) > 0
    assert any(p["category"] == "female" for p in data["recommended_packages"])


def test_ai_chat_weight_loss_consultation(client: TestClient):
    payload = {
        "message": "Tôi muốn tư vấn gói giảm cân 1 tháng giảm tầm 3kg",
        "chat_history": []
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["intent"] == "package_consultation"
    assert len(data["recommended_packages"]) > 0
    assert any(p["category"] == "lose_weight" for p in data["recommended_packages"])


def test_ai_chat_multi_turn_history(client: TestClient):
    payload = {
        "message": "Gói này có bao gồm đo InBody và xông hơi không?",
        "chat_history": [
            {"role": "user", "content": "Tư vấn gói giảm cân 1 tháng"},
            {"role": "assistant", "content": "Bạn nên chọn Gói Siết Mỡ Thần Tốc"}
        ]
    }
    response = client.post("/api/v1/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
