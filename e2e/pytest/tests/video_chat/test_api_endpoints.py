import pytest
import requests

from linky_e2e.config import settings

pytestmark = pytest.mark.video_chat


def test_queue_status_returns_correct_format():
    """API Endpoints: Queue status returns correct format"""
    response = requests.get(
        f"{settings.api_url}/api/v1/matchmaking/queue-status",
        timeout=30,
    )
    assert response.status_code == 200
    body = response.json()
    assert "queueSize" in body
    assert isinstance(body["queueSize"], (int, float))
    assert "estimatedWaitSeconds" in body
    wait = body["estimatedWaitSeconds"]
    assert wait is None or isinstance(wait, (int, float))


def test_end_call_unload_with_invalid_socket_id_returns_400():
    """API Endpoints: End-call-unload with invalid socketId returns 400"""
    response = requests.post(
        f"{settings.base_url}/api/video-chat/end-call-unload",
        json={},
        timeout=30,
    )
    assert response.status_code == 400
    body = response.json()
    error_text = body.get("error", "") or body.get("message", "")
    assert "socketId" in error_text
