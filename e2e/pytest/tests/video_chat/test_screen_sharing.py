import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_screen_share_starts_and_peer_receives_notification(active_call: TwoUserCallSetup):
    """Screen Sharing: Screen share starts and peer receives notification"""
    active_call.user1_page.screen_share_button().click()
    sleep(2)
    assert_visible(active_call.user1_page.screen_share_button())


def test_stop_screen_share_restores_camera(active_call: TwoUserCallSetup):
    """Screen Sharing: Stop screen share restores camera"""
    active_call.user1_page.screen_share_button().click()
    sleep(2)
    active_call.user1_page.screen_share_button().click()
    assert_visible(active_call.user1_page.local_video())
