import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup

pytestmark = pytest.mark.video_chat


def test_connection_quality_indicator_hidden_during_normal_call(active_call: TwoUserCallSetup):
    """Connection Quality Indicator: Hidden during normal call with good connection"""
    assert not active_call.user1_page.is_element_visible(
        "chat-connection-quality-indicator",
        timeout=3,
    )
