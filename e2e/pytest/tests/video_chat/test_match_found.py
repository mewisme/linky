import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_two_users_match_successfully(active_call: TwoUserCallSetup):
    """Matchmaking — Match Found: Two users match successfully"""
    assert_visible(active_call.user1_page.remote_video())
    assert_visible(active_call.user1_page.call_timer())
    assert_visible(active_call.user2_page.remote_video())
    assert_visible(active_call.user2_page.call_timer())


def test_match_delivers_peer_info(active_call: TwoUserCallSetup):
    """Matchmaking — Match Found: Match delivers peer info"""
    assert_visible(active_call.user1_page.remote_video())
    assert_visible(active_call.user2_page.remote_video())


def test_one_user_is_designated_as_offerer(active_call: TwoUserCallSetup):
    """Matchmaking — Match Found: One user is designated as offerer"""
    assert_visible(active_call.user1_page.remote_video())
    assert_visible(active_call.user2_page.remote_video())
