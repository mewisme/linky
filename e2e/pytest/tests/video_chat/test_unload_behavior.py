import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup, quit_call_driver
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_beforeunload_sends_end_call_via_fetch_beacon(active_call: TwoUserCallSetup):
    """Unload Behavior: beforeunload sends end-call via fetch/beacon"""
    quit_call_driver(active_call.user1_driver)
    active_call.user1_driver = None
    active_call.user2_page.wait_for_idle()
    assert_visible(active_call.user2_page.idle_container())
