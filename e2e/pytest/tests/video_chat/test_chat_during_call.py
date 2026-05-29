import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible, sleep

pytestmark = pytest.mark.video_chat


def test_chat_sidebar_opens_on_toggle():
    """Chat During Call: Chat sidebar opens on toggle"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.chat_toggle_button().click()
        assert_visible(setup.user1_page.chat_sidebar())
        assert_visible(setup.user1_page.chat_input())
    finally:
        teardown_two_user_call(setup)


def test_send_text_message_and_peer_receives_it():
    """Chat During Call: Send text message and peer receives it"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.chat_toggle_button().click()
        setup.user2_page.chat_toggle_button().click()
        setup.user1_page.send_chat_message("Hello from User 1")
        sleep(2)
        assert_visible(setup.user2_page.chat_messages_container())
    finally:
        teardown_two_user_call(setup)


def test_typing_indicator_relayed_to_peer():
    """Chat During Call: Typing indicator relayed to peer"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.chat_toggle_button().click()
        setup.user2_page.chat_toggle_button().click()
        inp = setup.user1_page.chat_input()
        inp.click()
        inp.clear()
        inp.send_keys("T")
        assert_visible(inp)
    finally:
        teardown_two_user_call(setup)


def test_empty_message_not_sent():
    """Chat During Call: Empty message not sent"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.chat_toggle_button().click()
        inp = setup.user1_page.chat_input()
        inp.clear()
        inp.send_keys("   ")
        setup.user1_page.chat_send_button().click()
        assert_visible(inp)
    finally:
        teardown_two_user_call(setup)
