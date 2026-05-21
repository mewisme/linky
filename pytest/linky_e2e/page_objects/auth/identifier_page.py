from __future__ import annotations

import re

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role, by_test_id
from linky_e2e.helpers.waits import wait_hidden, wait_visible


class IdentifierPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def email_input(self):
        return by_role(self._driver, "textbox", name=re.compile(r"emailAddress", re.I))

    def continue_button(self):
        return by_role(self._driver, "button", name=re.compile(r"continue", re.I))

    def error_message(self):
        return self._driver.find_element(*by_test_id("form-feedback-error"))

    def submit_email(self, email: str) -> None:
        self.email_input().clear()
        self.email_input().send_keys(email)
        self.continue_button().click()

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, ("xpath", "//input[contains(@aria-label,'mail') or @name='identifier']"), timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, ("xpath", "//input[contains(@aria-label,'mail') or @name='identifier']"), timeout)
