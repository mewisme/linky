import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_two_users_match_successfully():
    """Matchmaking — Match Found: Two users match successfully"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.remote_video())
        assert_visible(setup.user1_page.call_timer())
        assert_visible(setup.user2_page.remote_video())
        assert_visible(setup.user2_page.call_timer())
    finally:
        teardown_two_user_call(setup)


def test_match_delivers_peer_info():
    """Matchmaking — Match Found: Match delivers peer info"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.remote_video())
        assert_visible(setup.user2_page.remote_video())
    finally:
        teardown_two_user_call(setup)


def test_one_user_is_designated_as_offerer():
    """Matchmaking — Match Found: One user is designated as offerer"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.remote_video())
        assert_visible(setup.user2_page.remote_video())
    finally:
        teardown_two_user_call(setup)
