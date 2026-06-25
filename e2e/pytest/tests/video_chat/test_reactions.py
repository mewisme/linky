import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_reaction_events_relayed_to_peer(active_call: TwoUserCallSetup):
    """Reactions: Reaction events relayed to peer"""
    sleep(1)
    assert_visible(active_call.user1_page.remote_video())
    assert_visible(active_call.user2_page.remote_video())
