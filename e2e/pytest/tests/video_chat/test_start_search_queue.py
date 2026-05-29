import pytest

from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible

pytestmark = pytest.mark.video_chat


def test_start_search_transitions_to_searching_state(video_chat_page: VideoChatPage):
    """Matchmaking — Start Search & Queue: Start search transitions to searching state"""
    video_chat_page.goto()
    video_chat_page.reload()
    video_chat_page.wait_for_idle()
    video_chat_page.start_button().click()
    video_chat_page.wait_for_searching()
    assert_visible(video_chat_page.searching_indicator())


def test_cancel_search_button_visible_during_search(video_chat_page: VideoChatPage):
    """Matchmaking — Start Search & Queue: Cancel search button visible during search"""
    video_chat_page.goto()
    video_chat_page.reload()
    video_chat_page.wait_for_idle()
    video_chat_page.start_button().click()
    video_chat_page.wait_for_searching()
    assert_visible(video_chat_page.cancel_search_button())


def test_cancel_search_returns_to_idle(video_chat_page: VideoChatPage):
    """Matchmaking — Start Search & Queue: Cancel search returns to idle"""
    video_chat_page.goto()
    video_chat_page.reload()
    video_chat_page.wait_for_idle()
    video_chat_page.start_button().click()
    video_chat_page.wait_for_searching()
    video_chat_page.cancel_search_button().click()
    video_chat_page.wait_for_idle()
    assert_visible(video_chat_page.idle_container())
    assert_not_visible_by_test_id(video_chat_page, "chat-searching-indicator")


def test_cannot_join_queue_twice(video_chat_page: VideoChatPage):
    """Matchmaking — Start Search & Queue: Cannot join queue twice"""
    video_chat_page.goto()
    video_chat_page.reload()
    video_chat_page.wait_for_idle()
    video_chat_page.start_button().click()
    video_chat_page.wait_for_searching()
    video_chat_page.start_button().click()
    assert_visible(video_chat_page.searching_indicator())
