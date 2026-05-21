from __future__ import annotations

import re

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role, by_test_id, first_visible_css, scoped_css
from linky_e2e.helpers.waits import wait_hidden, wait_visible

_CLERK_SCOPE = '[data-clerk-ready="true"] '
_PASSWORD_FIELDS = 'input[name="password"], input#password, input[type="password"]'
_PASSWORD_INPUT_SCOPED_CSS = scoped_css(_CLERK_SCOPE, _PASSWORD_FIELDS)


class PasswordPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def password_input(self):
        el = first_visible_css(self._driver, _PASSWORD_INPUT_SCOPED_CSS, _PASSWORD_FIELDS)
        if el is not None:
            return el
        return by_role(self._driver, "textbox", name=re.compile(r"password", re.I))

    def continue_button(self):
        return by_role(self._driver, "button", name=re.compile(r"continue", re.I))

    def error_message(self):
        return self._driver.find_element(*by_test_id("form-feedback-error"))

    def submit_password(self, password: str) -> None:
        inp = self.password_input()
        inp.clear()
        inp.send_keys(password)
        self.continue_button().click()

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, ("css selector", _PASSWORD_INPUT_SCOPED_CSS), timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, ("css selector", _PASSWORD_INPUT_SCOPED_CSS), timeout)
