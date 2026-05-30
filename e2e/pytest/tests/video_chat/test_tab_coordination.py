import pytest

from linky_e2e.config import settings
from linky_e2e.fixtures.call import TwoUserCallSetup
from linky_e2e.helpers.locators import by_test_id
from linky_e2e.helpers.waits import wait_visible
from tests.video_chat._helpers import element_visible, sleep

pytestmark = pytest.mark.video_chat


def _open_second_tab(driver):
    handles_before = list(driver.window_handles)
    driver.execute_script("window.open('');")
    handles = driver.window_handles
    new_handle = [h for h in handles if h not in handles_before][0]
    driver.switch_to.window(new_handle)
    driver.get(f"{settings.base_url}/call")
    sleep(2)
    return new_handle


def test_second_tab_shows_passive_state_when_call_active_in_first_tab(active_call: TwoUserCallSetup):
    """Tab Coordination: Second tab shows passive state when call is active in first tab"""
    primary = active_call.user1_driver.current_window_handle
    _open_second_tab(active_call.user1_driver)
    passive = active_call.user1_driver.find_element(*by_test_id("chat-video-container-passive"))
    assert element_visible(passive)
    active_call.user1_driver.close()
    active_call.user1_driver.switch_to.window(primary)


def test_ownership_transfers_when_active_tab_is_closed(active_call: TwoUserCallSetup):
    """Tab Coordination: Ownership transfers when active tab is closed"""
    primary = active_call.user1_driver.current_window_handle
    second = _open_second_tab(active_call.user1_driver)
    active_call.user1_driver.switch_to.window(primary)
    active_call.user1_driver.close()
    active_call.user1_driver.switch_to.window(second)
    try:
        wait_visible(active_call.user1_driver, by_test_id("chat-idle-container"), 5)
        visible = True
    except Exception:
        visible = False
    assert visible
    active_call.user1_driver.close()
