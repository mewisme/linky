import pytest

from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible

pytestmark = pytest.mark.video_chat


def test_call_page_loads_in_idle_state(video_chat_page: VideoChatPage):
    """Call Page UI — Idle State: Call page loads in idle state"""
    video_chat_page.goto()
    video_chat_page.wait_for_idle()
    assert_visible(video_chat_page.idle_container())
    assert_visible(video_chat_page.start_button())
    assert_visible(video_chat_page.video_container())


def test_start_button_is_enabled_and_clickable(video_chat_page: VideoChatPage):
    """Call Page UI — Idle State: Start button is enabled and clickable"""
    video_chat_page.goto()
    video_chat_page.wait_for_idle()
    btn = video_chat_page.start_button()
    assert_visible(btn)
    assert btn.is_enabled()


def test_call_timer_not_visible_in_idle_state(video_chat_page: VideoChatPage):
    """Call Page UI — Idle State: Call timer not visible in idle state"""
    video_chat_page.goto()
    video_chat_page.wait_for_idle()
    assert_not_visible_by_test_id(video_chat_page, "chat-call-timer")


def test_chat_sidebar_hidden_in_idle_state(video_chat_page: VideoChatPage):
    """Call Page UI — Idle State: Chat sidebar hidden in idle state"""
    video_chat_page.goto()
    video_chat_page.wait_for_idle()
    assert_not_visible_by_test_id(video_chat_page, "chat-sidebar")
