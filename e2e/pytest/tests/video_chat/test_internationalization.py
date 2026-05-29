import pytest

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.waits import wait_for_clerk_ready
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_call_page_renders_in_english_default():
    """Internationalization (i18n): Call page renders in English (default)"""
    driver = create_cloak_driver()
    try:
        create_authenticated_driver(driver, TEST_USERS["user1"])
        page = VideoChatPage(driver)
        page.goto()
        page.wait_for_idle()
        assert_visible(page.start_button())
        assert_visible(page.idle_container())
    finally:
        quit_driver(driver)


def test_call_page_renders_in_vietnamese():
    """Internationalization (i18n): Call page renders in Vietnamese"""
    driver = create_cloak_driver()
    try:
        create_authenticated_driver(driver, TEST_USERS["user1"])
        page = VideoChatPage(driver)
        driver.get(f"{settings.base_url}/vi/call")
        wait_for_clerk_ready(driver)
        page.wait_for_idle()
        assert_visible(page.start_button())
        assert_visible(page.idle_container())
    finally:
        quit_driver(driver)


def test_vietnamese_idle_start_button_visible():
    """Internationalization (i18n): Vietnamese call page shows localized start control"""
    driver = create_cloak_driver()
    try:
        create_authenticated_driver(driver, TEST_USERS["user1"])
        page = VideoChatPage(driver)
        driver.get(f"{settings.base_url}/vi/call")
        wait_for_clerk_ready(driver)
        page.wait_for_idle()
        btn = page.start_button()
        assert_visible(btn)
        assert btn.is_enabled()
    finally:
        quit_driver(driver)
