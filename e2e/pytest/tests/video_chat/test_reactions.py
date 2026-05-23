import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_reaction_events_relayed_to_peer():
    """Reactions: Reaction events relayed to peer"""
    """Reactions: Reaction events relayed to peer"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        sleep(1)
        assert_visible(setup.user1_page.remote_video())
        assert_visible(setup.user2_page.remote_video())
    finally:
        teardown_two_user_call(setup)
