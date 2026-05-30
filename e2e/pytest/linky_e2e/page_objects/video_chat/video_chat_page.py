from __future__ import annotations

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement

from linky_e2e.helpers.locators import by_test_id, find_by_test_id
from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_visible

OVERFLOW_CONTROL_IDS = frozenset({
    "chat-toggle-button",
    "chat-add-favorite-button",
    "chat-remove-favorite-button",
    "chat-screen-share-button",
    "chat-swap-camera-button",
    "chat-pip-toggle-button",
    "chat-block-user-button",
    "chat-stream-quality-button",
})


class VideoChatPage:
    def __init__(self, driver: WebDriver) -> None:
        self.driver = driver

    def goto(self) -> None:
        from linky_e2e.config import settings

        self.driver.get(f"{settings.base_url}/call")
        wait_for_clerk_ready(self.driver)

    def reload(self) -> None:
        self.driver.refresh()
        wait_for_clerk_ready(self.driver)

    def wait_for_idle(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-idle-container"), timeout)

    def wait_for_in_call(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-remote-video"), timeout)
        wait_visible(self.driver, by_test_id("chat-call-timer"), timeout)

    def wait_for_searching(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-searching-indicator"), timeout)

    def wait_for_cancel_search_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-cancel-search-button"), timeout)
    
    def wait_for_start_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-start-button"), timeout)
    
    def wait_for_end_call_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-end-call-button"), timeout)
    
    def wait_for_skip_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-skip-button"), timeout)
    
    def wait_for_mute_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-mute-button"), timeout)
    
    def wait_for_video_toggle_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-video-toggle-button"), timeout)
    
    def wait_for_remote_video(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-remote-video"), timeout)
    
    def wait_for_local_video(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-local-video"), timeout)
    
    def wait_for_call_timer(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-call-timer"), timeout)
    
    def wait_for_camera_off_indicator(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-camera-off-indicator"), timeout)
    
    def wait_for_passive_video_container(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-video-container-passive"), timeout)
    
    def wait_for_video_container(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-video-container"), timeout)
    
    def wait_for_idle_container(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-idle-container"), timeout)
    
    def wait_for_searching_indicator(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-searching-indicator"), timeout)
    
    def wait_for_overflow_menu_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-overflow-menu-button"), timeout)
    
    def wait_for_chat_toggle_button(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-toggle-button"), timeout)
    
    def wait_for_chat_sidebar(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-sidebar"), timeout)
    
    def wait_for_chat_messages_container(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-messages-container"), timeout)
        
    def _visible_control(self, test_id: str) -> WebElement | None:
        for el in self.driver.find_elements(*by_test_id(test_id)):
            if el.is_displayed():
                return el
        return None

    def open_overflow_menu(self, timeout: float | None = None) -> None:
        self.overflow_menu_button().click()
        wait_visible(self.driver, by_test_id("chat-toggle-button"), timeout)

    def _find_control(self, test_id: str, timeout: float | None = None) -> WebElement:
        el = self._visible_control(test_id)
        if el is not None:
            return el
        if test_id in OVERFLOW_CONTROL_IDS:
            self.open_overflow_menu(timeout)
            return wait_visible(self.driver, by_test_id(test_id), timeout)
        return wait_visible(self.driver, by_test_id(test_id), timeout)

    def click_control(self, test_id: str, timeout: float | None = None) -> None:
        self._find_control(test_id, timeout).click()

    def start_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-start-button")

    def end_call_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-end-call-button")

    def skip_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-skip-button")

    def mute_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-mute-button")

    def video_toggle_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-video-toggle-button")

    def remote_video(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-remote-video")

    def local_video(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-local-video")

    def call_timer(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-call-timer")

    def camera_off_indicator(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-camera-off-indicator")

    def passive_video_container(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-video-container-passive")

    def video_container(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-video-container")

    def idle_container(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-idle-container")

    def searching_indicator(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-searching-indicator")

    def overflow_menu_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-overflow-menu-button")

    def chat_toggle_button(self) -> WebElement:
        return self._find_control("chat-toggle-button")

    def chat_sidebar(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-sidebar")

    def chat_messages_container(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-messages-container")

    def chat_input(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-input")

    def chat_send_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-send-button")

    def chat_message(self, message_id: str) -> WebElement:
        return find_by_test_id(self.driver, f"chat-message-{message_id}")

    def screen_share_button(self) -> WebElement:
        return self._find_control("chat-screen-share-button")

    def swap_camera_button(self) -> WebElement:
        return self._find_control("chat-swap-camera-button")

    def add_favorite_button(self) -> WebElement:
        return self._find_control("chat-add-favorite-button")

    def remove_favorite_button(self) -> WebElement:
        return self._find_control("chat-remove-favorite-button")

    def cancel_search_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-cancel-search-button")

    def pip_toggle_button(self) -> WebElement:
        return self._find_control("chat-pip-toggle-button")

    def block_user_button(self) -> WebElement:
        return self._find_control("chat-block-user-button")

    def stream_quality_button(self) -> WebElement:
        return self._find_control("chat-stream-quality-button")

    def floating_video_overlay(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-floating-video-overlay")

    def floating_expand_button(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-floating-expand-button")

    def connection_quality_indicator(self) -> WebElement:
        return find_by_test_id(self.driver, "chat-connection-quality-indicator")

    def send_chat_message(self, text: str) -> None:
        inp = self.chat_input()
        inp.clear()
        inp.send_keys(text)
        self.chat_send_button().click()

    def get_call_timer_text(self) -> str:
        return self.call_timer().text or ""

    def is_element_visible(self, test_id: str, timeout: float = 5) -> bool:
        try:
            wait_visible(self.driver, by_test_id(test_id), timeout)
            return True
        except (NoSuchElementException, Exception):
            return False
