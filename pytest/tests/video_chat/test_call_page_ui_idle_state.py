import pytest

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible

pytestmark = pytest.mark.video_chat


def _video_page() -> tuple:
    driver = create_cloak_driver()
    create_authenticated_driver(driver, TEST_USERS["user1"])
    return driver, VideoChatPage(driver)


def test_call_page_loads_in_idle_state():
    """Call Page UI — Idle State: Call page loads in idle state"""
    """Call Page UI — Idle State: Call page loads in idle state"""
    driver, page = _video_page()
    try:
        page.goto()
        page.wait_for_idle()
        assert_visible(page.idle_container())
        assert_visible(page.start_button())
        assert_visible(page.video_container())
    finally:
        quit_driver(driver)


def test_start_button_is_enabled_and_clickable():
    """Call Page UI — Idle State: Start button is enabled and clickable"""
    """Call Page UI — Idle State: Start button is enabled and clickable"""
    driver, page = _video_page()
    try:
        page.goto()
        page.wait_for_idle()
        btn = page.start_button()
        assert_visible(btn)
        assert btn.is_enabled()
    finally:
        quit_driver(driver)


def test_call_timer_not_visible_in_idle_state():
    """Call Page UI — Idle State: Call timer not visible in idle state"""
    """Call Page UI — Idle State: Call timer not visible in idle state"""
    driver, page = _video_page()
    try:
        page.goto()
        page.wait_for_idle()
        assert_not_visible_by_test_id(page, "chat-call-timer")
    finally:
        quit_driver(driver)


def test_chat_sidebar_hidden_in_idle_state():
    """Call Page UI — Idle State: Chat sidebar hidden in idle state"""
    """Call Page UI — Idle State: Chat sidebar hidden in idle state"""
    driver, page = _video_page()
    try:
        page.goto()
        page.wait_for_idle()
        assert_not_visible_by_test_id(page, "chat-sidebar")
    finally:
        quit_driver(driver)
