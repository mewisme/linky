import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_screen_share_starts_and_peer_receives_notification():
    """Screen Sharing: Screen share starts and peer receives notification"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.screen_share_button().click()
        sleep(2)
        assert_visible(setup.user1_page.screen_share_button())
    finally:
        teardown_two_user_call(setup)


def test_stop_screen_share_restores_camera():
    """Screen Sharing: Stop screen share restores camera"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.screen_share_button().click()
        sleep(2)
        setup.user1_page.screen_share_button().click()
        assert_visible(setup.user1_page.local_video())
    finally:
        teardown_two_user_call(setup)
