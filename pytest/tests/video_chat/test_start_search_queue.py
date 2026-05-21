import pytest

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible

pytestmark = pytest.mark.video_chat


def _page() -> tuple:
    driver = create_cloak_driver()
    create_authenticated_driver(driver, TEST_USERS["user1"])
    return driver, VideoChatPage(driver)


def test_start_search_transitions_to_searching_state():
    """Matchmaking — Start Search & Queue: Start search transitions to searching state"""
    """Matchmaking — Start Search & Queue: Start search transitions to searching state"""
    driver, page = _page()
    try:
        page.goto()
        page.wait_for_idle()
        page.start_button().click()
        page.wait_for_searching()
        assert_visible(page.searching_indicator())
    finally:
        quit_driver(driver)


def test_cancel_search_button_visible_during_search():
    """Matchmaking — Start Search & Queue: Cancel search button visible during search"""
    """Matchmaking — Start Search & Queue: Cancel search button visible during search"""
    driver, page = _page()
    try:
        page.goto()
        page.wait_for_idle()
        page.start_button().click()
        page.wait_for_searching()
        assert_visible(page.cancel_search_button())
    finally:
        quit_driver(driver)


def test_cancel_search_returns_to_idle():
    """Matchmaking — Start Search & Queue: Cancel search returns to idle"""
    """Matchmaking — Start Search & Queue: Cancel search returns to idle"""
    driver, page = _page()
    try:
        page.goto()
        page.wait_for_idle()
        page.start_button().click()
        page.wait_for_searching()
        page.cancel_search_button().click()
        page.wait_for_idle()
        assert_visible(page.idle_container())
        assert_not_visible_by_test_id(page, "chat-searching-indicator")
    finally:
        quit_driver(driver)


def test_cannot_join_queue_twice():
    """Matchmaking — Start Search & Queue: Cannot join queue twice"""
    """Matchmaking — Start Search & Queue: Cannot join queue twice"""
    driver, page = _page()
    try:
        page.goto()
        page.wait_for_idle()
        page.start_button().click()
        page.wait_for_searching()
        page.start_button().click()
        assert_visible(page.searching_indicator())
    finally:
        quit_driver(driver)
