import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible, element_visible, sleep

pytestmark = pytest.mark.video_chat


def test_remote_video_stream_renders(active_call: TwoUserCallSetup):
    """In-Call Core — Video & Audio: Remote video stream renders"""
    assert_visible(active_call.user1_page.remote_video())
    assert_visible(active_call.user2_page.remote_video())


def test_local_video_preview_renders(active_call: TwoUserCallSetup):
    """In-Call Core — Video & Audio: Local video preview renders"""
    assert_visible(active_call.user1_page.local_video())
    assert_visible(active_call.user2_page.local_video())


def test_call_timer_increments_during_call(active_call: TwoUserCallSetup):
    """In-Call Core — Video & Audio: Call timer increments during call"""
    timer1 = active_call.user1_page.get_call_timer_text()
    sleep(3)
    timer2 = active_call.user1_page.get_call_timer_text()
    assert timer1 != timer2


def test_camera_off_indicator_shown_when_video_disabled(active_call: TwoUserCallSetup):
    """In-Call Core — Video & Audio: Camera off indicator shown when video disabled"""
    active_call.user1_page.video_toggle_button().click()
    sleep(2)
    assert element_visible(active_call.user2_page.camera_off_indicator())
