import pytest
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_not_visible_by_test_id, assert_visible, element_visible, sleep

pytestmark = pytest.mark.video_chat


def test_mute_toggles_audio_and_notifies_peer(active_call: TwoUserCallSetup):
    """Call Controls: Mute toggles audio and notifies peer"""
    active_call.user1_page.mute_button().click()
    assert_visible(active_call.user1_page.mute_button())


def test_unmute_restores_audio(active_call: TwoUserCallSetup):
    """Call Controls: Unmute restores audio"""
    active_call.user1_page.mute_button().click()
    active_call.user1_page.mute_button().click()
    assert_visible(active_call.user1_page.mute_button())


def test_video_toggle_notifies_peer(active_call: TwoUserCallSetup):
    """Call Controls: Video toggle notifies peer"""
    active_call.user1_page.video_toggle_button().click()
    sleep(2)
    assert element_visible(active_call.user2_page.camera_off_indicator())


def test_swap_camera_cycles_camera_devices(active_call: TwoUserCallSetup):
    """Call Controls: Swap camera cycles camera devices"""
    active_call.user1_page.swap_camera_button().click()
    assert_visible(active_call.user1_page.local_video())


def test_end_call_via_button_returns_to_idle(active_call: TwoUserCallSetup):
    """Call Controls: End call via button returns to idle"""
    active_call.user1_page.end_call_button().click()
    active_call.user1_page.wait_for_idle()
    active_call.user2_page.wait_for_idle()
    assert_visible(active_call.user1_page.idle_container())
    assert_visible(active_call.user2_page.idle_container())
    assert_not_visible_by_test_id(active_call.user1_page, "chat-call-timer")
    assert_not_visible_by_test_id(active_call.user2_page, "chat-call-timer")


def test_end_call_via_keyboard_shortcut_mod_d(active_call: TwoUserCallSetup):
    """Call Controls: End call via keyboard shortcut (Mod+D)"""
    ActionChains(active_call.user1_driver).key_down(Keys.CONTROL).send_keys("d").key_up(
        Keys.CONTROL
    ).perform()
    active_call.user1_page.wait_for_idle()
    assert_visible(active_call.user1_page.idle_container())
