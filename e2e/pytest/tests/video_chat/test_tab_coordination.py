import pytest

from linky_e2e.config import settings
from linky_e2e.fixtures.call import (
    establish_call,
    setup_two_user_call,
    teardown_two_user_call,
)
from linky_e2e.fixtures.users import TEST_USERS
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


def test_second_tab_shows_passive_state_when_call_active_in_first_tab():
    """Tab Coordination: Second tab shows passive state when call is active in first tab"""
    """Tab Coordination: Second tab shows passive state when call is active in first tab"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        primary = setup.user1_driver.current_window_handle
        _open_second_tab(setup.user1_driver)
        passive = setup.user1_driver.find_element(*by_test_id("chat-video-container-passive"))
        assert element_visible(passive)
        setup.user1_driver.close()
        setup.user1_driver.switch_to.window(primary)
    finally:
        teardown_two_user_call(setup)


def test_ownership_transfers_when_active_tab_is_closed():
    """Tab Coordination: Ownership transfers when active tab is closed"""
    """Tab Coordination: Ownership transfers when active tab is closed"""
    setup = setup_two_user_call(TEST_USERS["user1"], TEST_USERS["user2"])
    try:
        establish_call(setup.user1_page, setup.user2_page)
        primary = setup.user1_driver.current_window_handle
        second = _open_second_tab(setup.user1_driver)
        setup.user1_driver.switch_to.window(primary)
        setup.user1_driver.close()
        setup.user1_driver.switch_to.window(second)
        try:
            wait_visible(setup.user1_driver, by_test_id("chat-idle-container"), 5)
            visible = True
        except Exception:
            visible = False
        assert visible
        setup.user1_driver.close()
    finally:
        teardown_two_user_call(setup)
