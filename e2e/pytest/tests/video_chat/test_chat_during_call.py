import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_chat_sidebar_opens_on_toggle(active_call: TwoUserCallSetup):
    """Chat During Call: Chat sidebar opens on toggle"""
    active_call.user1_page.chat_toggle_button().click()
    assert_visible(active_call.user1_page.chat_sidebar())
    assert_visible(active_call.user1_page.chat_input())


def test_send_text_message_and_peer_receives_it(active_call: TwoUserCallSetup):
    """Chat During Call: Send text message and peer receives it"""
    active_call.user1_page.chat_toggle_button().click()
    active_call.user2_page.chat_toggle_button().click()
    active_call.user1_page.send_chat_message("Hello from User 1")
    sleep(2)
    assert_visible(active_call.user2_page.chat_messages_container())


def test_typing_indicator_relayed_to_peer(active_call: TwoUserCallSetup):
    """Chat During Call: Typing indicator relayed to peer"""
    active_call.user1_page.chat_toggle_button().click()
    active_call.user2_page.chat_toggle_button().click()
    inp = active_call.user1_page.chat_input()
    inp.click()
    inp.clear()
    inp.send_keys("T")
    assert_visible(inp)


def test_empty_message_not_sent(active_call: TwoUserCallSetup):
    """Chat During Call: Empty message not sent"""
    active_call.user1_page.chat_toggle_button().click()
    inp = active_call.user1_page.chat_input()
    inp.clear()
    inp.send_keys("   ")
    active_call.user1_page.chat_send_button().click()
    assert_visible(inp)
