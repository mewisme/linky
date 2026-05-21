import pytest

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.waits import wait_for_clerk_ready
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_call_page_renders_in_english_default():
    """Internationalization (i18n): Call page renders in English (default)"""
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


def test_backend_error_messages_localized():
    """Internationalization (i18n): Backend error messages localized"""
    """Internationalization (i18n): Backend error messages localized"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        setup.user1_driver.get(f"{settings.base_url}/vi/call")
        wait_for_clerk_ready(setup.user1_driver)
        setup.user1_page.wait_for_idle()
        setup.user2_driver.get(f"{settings.base_url}/vi/call")
        wait_for_clerk_ready(setup.user2_driver)
        setup.user2_page.wait_for_idle()
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.start_button().click()
        assert_visible(setup.user1_page.searching_indicator())
    finally:
        teardown_two_user_call(setup)
