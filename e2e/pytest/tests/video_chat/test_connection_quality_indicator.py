import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS

pytestmark = pytest.mark.video_chat


def test_connection_quality_indicator_hidden_during_normal_call():
    """Connection Quality Indicator: Hidden during normal call with good connection"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        assert not setup.user1_page.is_element_visible(
            "chat-connection-quality-indicator",
            timeout=3,
        )
    finally:
        teardown_two_user_call(setup)
