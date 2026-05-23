from __future__ import annotations

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import find_by_test_id
from linky_e2e.helpers.waits import wait_hidden, wait_visible


class LandingPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def go_to_chat_button(self):
        return find_by_test_id(self._driver, "start-chat-button")

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, ("css selector", '[data-testid="start-chat-button"]'), timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, ("css selector", '[data-testid="start-chat-button"]'), timeout)
