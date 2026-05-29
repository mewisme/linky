import pytest

from linky_e2e.config import settings
from linky_e2e.helpers.waits import wait_for_clerk_ready
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_call_page_renders_in_english_default(user1_page: VideoChatPage):
    """Internationalization (i18n): Call page renders in English (default)"""
    user1_page.goto()
    user1_page.wait_for_idle()
    assert_visible(user1_page.start_button())
    assert_visible(user1_page.idle_container())


def test_call_page_renders_in_vietnamese(user1_page: VideoChatPage, user1_driver):
    """Internationalization (i18n): Call page renders in Vietnamese"""
    user1_driver.get(f"{settings.base_url}/vi/call")
    wait_for_clerk_ready(user1_driver)
    user1_page.wait_for_idle()
    assert_visible(user1_page.start_button())
    assert_visible(user1_page.idle_container())


def test_vietnamese_idle_start_button_visible(user1_page: VideoChatPage, user1_driver):
    """Internationalization (i18n): Vietnamese call page shows localized start control"""
    user1_driver.get(f"{settings.base_url}/vi/call")
    wait_for_clerk_ready(user1_driver)
    user1_page.wait_for_idle()
    btn = user1_page.start_button()
    assert_visible(btn)
    assert btn.is_enabled()
