import pytest

from linky_e2e.config import settings
from linky_e2e.fixtures.call import (
    end_call,
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible, element_visible, sleep

pytestmark = pytest.mark.video_chat


def test_floating_overlay_appears_when_navigating_away_from_call_page():
    """Floating Call (PiP): Floating overlay appears when navigating away from call page"""
    """Floating Call (PiP): Floating overlay appears when navigating away from call page"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_driver.get(f"{settings.base_url}/dashboard")
        sleep(2)
        assert_visible(setup.user1_page.remote_video())
    finally:
        teardown_two_user_call(setup)


def test_expand_floating_overlay_returns_to_full_call_page():
    """Floating Call (PiP): Expand floating overlay returns to full call page"""
    """Floating Call (PiP): Expand floating overlay returns to full call page"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_driver.get(f"{settings.base_url}/dashboard")
        sleep(2)
        setup.user1_driver.get(f"{settings.base_url}/call")
        sleep(2)
        assert_visible(setup.user1_page.video_container())
    finally:
        teardown_two_user_call(setup)


def test_floating_overlay_hidden_after_call_ends():
    """Floating Call (PiP): Floating overlay hidden after call ends"""
    """Floating Call (PiP): Floating overlay hidden after call ends"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_driver.get(f"{settings.base_url}/dashboard")
        sleep(2)
        end_call(setup.user1_page, setup.user2_page)
        assert not element_visible(setup.user1_page.remote_video())
    finally:
        teardown_two_user_call(setup)
