import pytest

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_visible, element_visible, sleep

pytestmark = pytest.mark.video_chat


def test_remote_video_stream_renders():
    """In-Call Core — Video & Audio: Remote video stream renders"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.remote_video())
        assert_visible(setup.user2_page.remote_video())
    finally:
        teardown_two_user_call(setup)


def test_local_video_preview_renders():
    """In-Call Core — Video & Audio: Local video preview renders"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        assert_visible(setup.user1_page.local_video())
        assert_visible(setup.user2_page.local_video())
    finally:
        teardown_two_user_call(setup)


def test_call_timer_increments_during_call():
    """In-Call Core — Video & Audio: Call timer increments during call"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        timer1 = setup.user1_page.get_call_timer_text()
        sleep(3)
        timer2 = setup.user1_page.get_call_timer_text()
        assert timer1 != timer2
    finally:
        teardown_two_user_call(setup)


def test_camera_off_indicator_shown_when_video_disabled():
    """In-Call Core — Video & Audio: Camera off indicator shown when video disabled"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.video_toggle_button().click()
        sleep(2)
        assert element_visible(setup.user2_page.camera_off_indicator())
    finally:
        teardown_two_user_call(setup)
