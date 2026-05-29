import pytest
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible, element_visible, sleep

pytestmark = pytest.mark.video_chat


def test_mute_toggles_audio_and_notifies_peer():
    """Call Controls: Mute toggles audio and notifies peer"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.mute_button().click()
        assert_visible(setup.user1_page.mute_button())
    finally:
        teardown_two_user_call(setup)


def test_unmute_restores_audio():
    """Call Controls: Unmute restores audio"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.mute_button().click()
        setup.user1_page.mute_button().click()
        assert_visible(setup.user1_page.mute_button())
    finally:
        teardown_two_user_call(setup)


def test_video_toggle_notifies_peer():
    """Call Controls: Video toggle notifies peer"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.video_toggle_button().click()
        sleep(2)
        assert element_visible(setup.user2_page.camera_off_indicator())
    finally:
        teardown_two_user_call(setup)


def test_swap_camera_cycles_camera_devices():
    """Call Controls: Swap camera cycles camera devices"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.swap_camera_button().click()
        assert_visible(setup.user1_page.local_video())
    finally:
        teardown_two_user_call(setup)


def test_end_call_via_button_returns_to_idle():
    """Call Controls: End call via button returns to idle"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        setup.user1_page.end_call_button().click()
        setup.user1_page.wait_for_idle()
        setup.user2_page.wait_for_idle()
        assert_visible(setup.user1_page.idle_container())
        assert_visible(setup.user2_page.idle_container())
        assert_not_visible_by_test_id(setup.user1_page, "chat-call-timer")
        assert_not_visible_by_test_id(setup.user2_page, "chat-call-timer")
    finally:
        teardown_two_user_call(setup)


def test_end_call_via_keyboard_shortcut_mod_d():
    """Call Controls: End call via keyboard shortcut (Mod+D)"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        ActionChains(setup.user1_driver).key_down(Keys.CONTROL).send_keys("d").key_up(
            Keys.CONTROL
        ).perform()
        setup.user1_page.wait_for_idle()
        assert_visible(setup.user1_page.idle_container())
    finally:
        teardown_two_user_call(setup)
