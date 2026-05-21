from __future__ import annotations

import time

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_test_id, find_by_test_id
from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_visible


class VideoChatPage:
    def __init__(self, driver: WebDriver) -> None:
        self.driver = driver

    def goto(self) -> None:
        from linky_e2e.config import settings

        self.driver.get(f"{settings.base_url}/call")
        wait_for_clerk_ready(self.driver)

    def wait_for_idle(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-idle-container"), timeout)

    def wait_for_in_call(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-remote-video"), timeout)
        wait_visible(self.driver, by_test_id("chat-call-timer"), timeout)

    def wait_for_searching(self, timeout: float | None = None) -> None:
        wait_visible(self.driver, by_test_id("chat-searching-indicator"), timeout)

    def start_button(self):
        return find_by_test_id(self.driver, "chat-start-button")

    def end_call_button(self):
        return find_by_test_id(self.driver, "chat-end-call-button")

    def skip_button(self):
        return find_by_test_id(self.driver, "chat-skip-button")

    def mute_button(self):
        return find_by_test_id(self.driver, "chat-mute-button")

    def video_toggle_button(self):
        return find_by_test_id(self.driver, "chat-video-toggle-button")

    def remote_video(self):
        return find_by_test_id(self.driver, "chat-remote-video")

    def local_video(self):
        return find_by_test_id(self.driver, "chat-local-video")

    def call_timer(self):
        return find_by_test_id(self.driver, "chat-call-timer")

    def camera_off_indicator(self):
        return find_by_test_id(self.driver, "chat-camera-off-indicator")

    def passive_video_container(self):
        return find_by_test_id(self.driver, "chat-video-container-passive")

    def video_container(self):
        return find_by_test_id(self.driver, "chat-video-container")

    def idle_container(self):
        return find_by_test_id(self.driver, "chat-idle-container")

    def searching_indicator(self):
        return find_by_test_id(self.driver, "chat-searching-indicator")

    def chat_toggle_button(self):
        return find_by_test_id(self.driver, "chat-toggle-button")

    def chat_sidebar(self):
        return find_by_test_id(self.driver, "chat-sidebar")

    def chat_messages_container(self):
        return find_by_test_id(self.driver, "chat-messages-container")

    def chat_input(self):
        return find_by_test_id(self.driver, "chat-input")

    def chat_send_button(self):
        return find_by_test_id(self.driver, "chat-send-button")

    def screen_share_button(self):
        return find_by_test_id(self.driver, "chat-screen-share-button")

    def swap_camera_button(self):
        return find_by_test_id(self.driver, "chat-swap-camera-button")

    def add_favorite_button(self):
        return find_by_test_id(self.driver, "chat-add-favorite-button")

    def remove_favorite_button(self):
        return find_by_test_id(self.driver, "chat-remove-favorite-button")

    def cancel_search_button(self):
        return find_by_test_id(self.driver, "chat-cancel-search-button")

    def connection_quality_indicator(self):
        return self.driver.find_element("css selector", ".connection-quality-indicator")

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
        except Exception:
            return False
