import pytest

from linky_e2e.browser.cloak_driver import quit_driver
from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_peer_disconnect_triggers_end_call_for_remaining_user():
    """Disconnect & Reconnection: Peer disconnect triggers end-call for remaining user"""
    """Disconnect & Reconnection: Peer disconnect triggers end-call for remaining user"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        quit_driver(setup.user1_driver)
        setup.user2_page.wait_for_idle()
        assert_visible(setup.user2_page.idle_container())
    finally:
        teardown_two_user_call(setup)


def test_session_resync_after_reconnection():
    """Disconnect & Reconnection: Session resync after reconnection"""
    """Disconnect & Reconnection: Session resync after reconnection"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.remote_video())
    finally:
        teardown_two_user_call(setup)
