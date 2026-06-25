import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible, element_visible, sleep

pytestmark = pytest.mark.video_chat


def test_skip_during_call_re_queues_skipper(active_call: TwoUserCallSetup):
    """Skip Flow: Skip during call re-queues skipper"""
    active_call.user1_page.skip_button().click()
    active_call.user1_page.wait_for_searching()
    assert_visible(active_call.user1_page.searching_indicator())


def test_peer_receives_skip_notification(active_call: TwoUserCallSetup):
    """Skip Flow: Peer receives skip notification"""
    active_call.user1_page.skip_button().click()
    sleep(2)
    assert element_visible(active_call.user2_page.searching_indicator())


def test_skip_records_mutual_skips_to_prevent_re_matching(active_call: TwoUserCallSetup):
    """Skip Flow: Skip records mutual skips to prevent re-matching"""
    active_call.user1_page.skip_button().click()
    active_call.user1_page.wait_for_searching()
    sleep(5)
    assert_visible(active_call.user1_page.searching_indicator())
