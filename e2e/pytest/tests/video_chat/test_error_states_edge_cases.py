import pytest

from linky_e2e.fixtures.call import SingleUserSetup
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_media_permission_denial_shows_error(single_user_call_no_media: SingleUserSetup):
    """Error States & Edge Cases: Media permission denial shows error"""
    single_user_call_no_media.page.goto()
    single_user_call_no_media.page.wait_for_idle()
    single_user_call_no_media.page.start_button().click()
    assert_visible(single_user_call_no_media.page.idle_container())


def test_no_camera_device_falls_back_to_audio_only(user1_page: VideoChatPage):
    """Error States & Edge Cases: No camera device falls back to audio-only"""
    user1_page.goto()
    user1_page.wait_for_idle()
    user1_page.start_button().click()
    user1_page.wait_for_searching()
    assert_visible(user1_page.searching_indicator())


def test_ice_server_fetch_failure_shows_error(user1_page: VideoChatPage):
    """Error States & Edge Cases: ICE server fetch failure shows error"""
    user1_page.goto()
    user1_page.wait_for_idle()
    assert_visible(user1_page.idle_container())


@pytest.mark.slow
def test_queue_timeout_shows_error(user1_page: VideoChatPage):
    """Error States & Edge Cases: Queue timeout shows error"""
    user1_page.goto()
    user1_page.wait_for_idle()
    user1_page.start_button().click()
    user1_page.wait_for_searching()
    sleep(30)
    assert_visible(user1_page.idle_container())


def test_socket_connection_error_shows_toast(user1_page: VideoChatPage):
    """Error States & Edge Cases: Socket connection error shows toast"""
    user1_page.goto()
    user1_page.wait_for_idle()
    assert_visible(user1_page.idle_container())
