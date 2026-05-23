import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS

pytestmark = pytest.mark.video_chat


def test_connection_quality_indicator_visible_during_call():
    """Connection Quality Indicator: Connection quality indicator visible during call"""
    """Connection Quality Indicator: Connection quality indicator visible during call"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        indicator = setup.user1_page.connection_quality_indicator()
        assert indicator is not None
    finally:
        teardown_two_user_call(setup)
