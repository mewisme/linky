import pytest

from linky_e2e.config import settings
from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.waits import wait_visible
from linky_e2e.helpers.locators import by_test_id
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_floating_overlay_appears_when_navigating_away_from_call_page():
    """Floating Call (PiP): Floating overlay appears when navigating away from call page"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_driver.get(f"{settings.base_url}/dashboard")
        sleep(2)
        assert_visible(setup.user1_page.floating_video_overlay())
    finally:
        teardown_two_user_call(setup)


def test_expand_floating_overlay_returns_to_full_call_page():
    """Floating Call (PiP): Expand floating overlay returns to full call page"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_driver.get(f"{settings.base_url}/dashboard")
        sleep(2)
        overlay = setup.user1_page.floating_video_overlay()
        setup.user1_driver.execute_script(
            "arguments[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));",
            overlay,
        )
        sleep(0.5)
        wait_visible(setup.user1_driver, by_test_id("chat-floating-expand-button"), 5)
        setup.user1_page.floating_expand_button().click()
        sleep(2)
        assert "/call" in setup.user1_driver.current_url
        assert_visible(setup.user1_page.video_container())
    finally:
        teardown_two_user_call(setup)


def test_floating_overlay_hidden_after_call_ends():
    """Floating Call (PiP): Floating overlay hidden after call ends"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_driver.get(f"{settings.base_url}/dashboard")
        sleep(2)
        setup.user2_page.end_call_button().click()
        setup.user2_page.wait_for_idle()
        assert not setup.user1_page.is_element_visible("chat-floating-video-overlay", timeout=3)
    finally:
        teardown_two_user_call(setup)
