import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup, quit_call_driver
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_peer_disconnect_triggers_end_call_for_remaining_user(active_call: TwoUserCallSetup):
    """Disconnect & Reconnection: Peer disconnect triggers end-call for remaining user"""
    quit_call_driver(active_call.user1_driver)
    active_call.user1_driver = None
    active_call.user2_page.wait_for_idle()
    assert_visible(active_call.user2_page.idle_container())


def test_session_resync_after_reconnection(active_call: TwoUserCallSetup):
    """Disconnect & Reconnection: Session resync after reconnection"""
    assert_visible(active_call.user1_page.remote_video())
