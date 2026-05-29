import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    quit_call_driver,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_beforeunload_sends_end_call_via_fetch_beacon():
    """Unload Behavior: beforeunload sends end-call via fetch/beacon"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        quit_call_driver(setup.user1_driver)
        setup.user1_driver = None
        setup.user2_page.wait_for_idle()
        assert_visible(setup.user2_page.idle_container())
    finally:
        teardown_two_user_call(setup)
