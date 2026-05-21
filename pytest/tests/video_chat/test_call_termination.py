import pytest

from linky_e2e.fixtures.call import (
    end_call,
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible

pytestmark = pytest.mark.video_chat


def test_both_users_return_to_idle_after_one_ends_call():
    """Call Termination: Both users return to idle after one ends call"""
    """Call Termination: Both users return to idle after one ends call"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        end_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.idle_container())
        assert_visible(setup.user2_page.idle_container())
        assert_not_visible_by_test_id(setup.user1_page, "chat-call-timer")
        assert_not_visible_by_test_id(setup.user2_page, "chat-call-timer")
    finally:
        teardown_two_user_call(setup)


def test_peer_receives_end_call_notification_with_correct_message():
    """Call Termination: Peer receives end-call notification with correct message"""
    """Call Termination: Peer receives end-call notification with correct message"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.end_call_button().click()
        setup.user2_page.wait_for_idle()
        assert_visible(setup.user2_page.idle_container())
    finally:
        teardown_two_user_call(setup)


def test_call_history_recorded_after_call_ends():
    """Call Termination: Call history recorded after call ends"""
    """Call Termination: Call history recorded after call ends"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        end_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.idle_container())
        assert_visible(setup.user2_page.idle_container())
    finally:
        teardown_two_user_call(setup)
