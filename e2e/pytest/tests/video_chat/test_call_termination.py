import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup, end_call
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible

pytestmark = pytest.mark.video_chat


def test_both_users_return_to_idle_after_one_ends_call(active_call: TwoUserCallSetup):
    """Call Termination: Both users return to idle after one ends call"""
    end_call(active_call.user1_page, active_call.user2_page)
    assert_visible(active_call.user1_page.idle_container())
    assert_visible(active_call.user2_page.idle_container())
    assert_not_visible_by_test_id(active_call.user1_page, "chat-call-timer")
    assert_not_visible_by_test_id(active_call.user2_page, "chat-call-timer")


def test_peer_receives_end_call_notification_with_correct_message(active_call: TwoUserCallSetup):
    """Call Termination: Peer receives end-call notification with correct message"""
    active_call.user1_page.end_call_button().click()
    active_call.user2_page.wait_for_idle()
    assert_visible(active_call.user2_page.idle_container())


def test_call_history_recorded_after_call_ends(active_call: TwoUserCallSetup):
    """Call Termination: Call history recorded after call ends"""
    end_call(active_call.user1_page, active_call.user2_page)
    assert_visible(active_call.user1_page.idle_container())
    assert_visible(active_call.user2_page.idle_container())
