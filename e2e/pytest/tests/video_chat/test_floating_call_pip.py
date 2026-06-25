import pytest

from linky_e2e.config import settings
from linky_e2e.fixtures.call import TwoUserCallSetup
from linky_e2e.helpers.locators import by_test_id
from linky_e2e.helpers.waits import wait_visible
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_floating_overlay_appears_when_navigating_away_from_call_page(active_call: TwoUserCallSetup):
    """Floating Call (PiP): Floating overlay appears when navigating away from call page"""
    active_call.user1_driver.get(f"{settings.base_url}/dashboard")
    sleep(2)
    assert_visible(active_call.user1_page.floating_video_overlay())


def test_expand_floating_overlay_returns_to_full_call_page(active_call: TwoUserCallSetup):
    """Floating Call (PiP): Expand floating overlay returns to full call page"""
    active_call.user1_driver.get(f"{settings.base_url}/dashboard")
    sleep(2)
    overlay = active_call.user1_page.floating_video_overlay()
    active_call.user1_driver.execute_script(
        "arguments[0].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));",
        overlay,
    )
    sleep(0.5)
    wait_visible(active_call.user1_driver, by_test_id("chat-floating-expand-button"), 5)
    active_call.user1_page.floating_expand_button().click()
    sleep(2)
    assert "/call" in active_call.user1_driver.current_url
    assert_visible(active_call.user1_page.video_container())


def test_floating_overlay_hidden_after_call_ends(active_call: TwoUserCallSetup):
    """Floating Call (PiP): Floating overlay hidden after call ends"""
    active_call.user1_driver.get(f"{settings.base_url}/dashboard")
    sleep(2)
    active_call.user2_page.end_call_button().click()
    active_call.user2_page.wait_for_idle()
    assert not active_call.user1_page.is_element_visible("chat-floating-video-overlay", timeout=3)
