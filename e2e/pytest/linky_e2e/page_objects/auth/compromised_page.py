from __future__ import annotations

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.waits import wait_hidden, wait_visible

_SEND_EMAIL_BUTTON_XPATH = (
    '//button[contains(translate(normalize-space(.), '
    '"ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "email code to")]'
)
_SEND_EMAIL_BUTTON_LOCATOR = ("xpath", _SEND_EMAIL_BUTTON_XPATH)


class CompromisedPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def send_email_button(self):
        return self._driver.find_element(*_SEND_EMAIL_BUTTON_LOCATOR)

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _SEND_EMAIL_BUTTON_LOCATOR, timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, _SEND_EMAIL_BUTTON_LOCATOR, timeout)