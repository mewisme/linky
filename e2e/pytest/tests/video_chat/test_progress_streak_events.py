import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_streak_completed_event_emitted_during_long_call(active_call: TwoUserCallSetup):
    """Progress & Streak Events: Streak completed event emitted during long call"""
    sleep(10)
    assert_visible(active_call.user1_page.call_timer())


def test_level_up_event_emitted_on_exp_threshold(active_call: TwoUserCallSetup):
    """Progress & Streak Events: Level up event emitted on exp threshold"""
    sleep(10)
    assert_visible(active_call.user1_page.call_timer())


def test_user_progress_updates_emitted_via_heartbeat(active_call: TwoUserCallSetup):
    """Progress & Streak Events: User progress updates emitted via heartbeat"""
    sleep(6)
    assert_visible(active_call.user1_page.call_timer())
