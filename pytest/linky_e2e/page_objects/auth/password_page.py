from __future__ import annotations

import re

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role, by_test_id
from linky_e2e.helpers.waits import wait_hidden, wait_visible


class PasswordPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def password_input(self):
        return self._driver.find_element("css selector", 'input[type="password"]')

    def continue_button(self):
        return by_role(self._driver, "button", name=re.compile(r"continue", re.I))

    def error_message(self):
        return self._driver.find_element(*by_test_id("form-feedback-error"))

    def submit_password(self, password: str) -> None:
        inp = self.password_input()
        inp.clear()
        inp.send_keys(password)
        inp.send_keys("\n")

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, ("css selector", 'input[type="password"]'), timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, ("css selector", 'input[type="password"]'), timeout)
