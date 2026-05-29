import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible, element_visible, sleep

pytestmark = pytest.mark.video_chat


def test_skip_during_call_re_queues_skipper():
    """Skip Flow: Skip during call re-queues skipper"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.skip_button().click()
        setup.user1_page.wait_for_searching()
        assert_visible(setup.user1_page.searching_indicator())
    finally:
        teardown_two_user_call(setup)


def test_peer_receives_skip_notification():
    """Skip Flow: Peer receives skip notification"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.skip_button().click()
        sleep(2)
        assert element_visible(setup.user2_page.searching_indicator())
    finally:
        teardown_two_user_call(setup)


def test_skip_records_mutual_skips_to_prevent_re_matching():
    """Skip Flow: Skip records mutual skips to prevent re-matching"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.skip_button().click()
        setup.user1_page.wait_for_searching()
        sleep(5)
        assert_visible(setup.user1_page.searching_indicator())
    finally:
        teardown_two_user_call(setup)
