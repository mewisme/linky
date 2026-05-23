from __future__ import annotations

import re

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role
from linky_e2e.helpers.waits import wait_hidden


class ResetPasswordPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def reset_password_button(self):
        return by_role(self._driver, "button", name=re.compile(r"reset your password", re.I))

    def breach_warning(self):
        return self._driver.find_element(
            "xpath",
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'password has been found as part of a breach')]",
        )

    def submit_reset_password(self) -> None:
        self.reset_password_button().click()

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(
            self._driver,
            (
                "xpath",
                "//button[contains(translate(normalize-space(.), "
                "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
                "'reset your password')]",
            ),
            timeout,
        )
