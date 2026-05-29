import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_add_favorite_notifies_peer():
    """Favorites During Call: Add favorite notifies peer"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.add_favorite_button().click()
        assert_visible(setup.user1_page.add_favorite_button())
    finally:
        teardown_two_user_call(setup)


def test_remove_favorite_notifies_peer():
    """Favorites During Call: Remove favorite notifies peer"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.remove_favorite_button().click()
        assert_visible(setup.user1_page.remove_favorite_button())
    finally:
        teardown_two_user_call(setup)
