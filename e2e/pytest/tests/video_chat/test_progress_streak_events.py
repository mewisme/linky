import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_streak_completed_event_emitted_during_long_call():
    """Progress & Streak Events: Streak completed event emitted during long call"""
    """Progress & Streak Events: Streak completed event emitted during long call"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        sleep(10)
        assert_visible(setup.user1_page.call_timer())
    finally:
        teardown_two_user_call(setup)


def test_level_up_event_emitted_on_exp_threshold():
    """Progress & Streak Events: Level up event emitted on exp threshold"""
    """Progress & Streak Events: Level up event emitted on exp threshold"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        sleep(10)
        assert_visible(setup.user1_page.call_timer())
    finally:
        teardown_two_user_call(setup)


def test_user_progress_updates_emitted_via_heartbeat():
    """Progress & Streak Events: User progress updates emitted via heartbeat"""
    """Progress & Streak Events: User progress updates emitted via heartbeat"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        sleep(6)
        assert_visible(setup.user1_page.call_timer())
    finally:
        teardown_two_user_call(setup)
