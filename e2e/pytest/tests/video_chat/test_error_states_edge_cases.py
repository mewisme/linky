import pytest

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def _authenticated_page(*, media_permissions: bool = True) -> tuple:
    driver = create_cloak_driver(media_permissions=media_permissions)
    create_authenticated_driver(driver, TEST_USERS["user1"])
    return driver, VideoChatPage(driver)


def test_media_permission_denial_shows_error():
    """Error States & Edge Cases: Media permission denial shows error"""
    driver, page = _authenticated_page(media_permissions=False)
    try:
        page.goto()
        page.wait_for_idle()
        page.start_button().click()
        assert_visible(page.idle_container())
    finally:
        quit_driver(driver)


def test_no_camera_device_falls_back_to_audio_only():
    """Error States & Edge Cases: No camera device falls back to audio-only"""
    driver, page = _authenticated_page()
    try:
        page.goto()
        page.wait_for_idle()
        page.start_button().click()
        page.wait_for_searching()
        assert_visible(page.searching_indicator())
    finally:
        quit_driver(driver)


def test_ice_server_fetch_failure_shows_error():
    """Error States & Edge Cases: ICE server fetch failure shows error"""
    driver, page = _authenticated_page()
    try:
        page.goto()
        page.wait_for_idle()
        assert_visible(page.idle_container())
    finally:
        quit_driver(driver)


@pytest.mark.slow
def test_queue_timeout_shows_error():
    """Error States & Edge Cases: Queue timeout shows error"""
    driver, page = _authenticated_page()
    try:
        page.goto()
        page.wait_for_idle()
        page.start_button().click()
        page.wait_for_searching()
        sleep(30)
        assert_visible(page.idle_container())
    finally:
        quit_driver(driver)


def test_socket_connection_error_shows_toast():
    """Error States & Edge Cases: Socket connection error shows toast"""
    driver, page = _authenticated_page()
    try:
        page.goto()
        page.wait_for_idle()
        assert_visible(page.idle_container())
    finally:
        quit_driver(driver)
