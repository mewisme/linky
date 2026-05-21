from __future__ import annotations

import re

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role, by_test_id
from linky_e2e.helpers.waits import wait_hidden, wait_visible


class OTPPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def otp_input(self):
        return self._driver.find_element(
            "css selector",
            'input[autocomplete="one-time-code"], input[name*="code"], input[name*="otp"], input[inputmode="numeric"]',
        )

    def submit_otp_button(self):
        return by_role(self._driver, "button", name=re.compile(r"continue", re.I))

    def error_message(self):
        return self._driver.find_element(*by_test_id("form-feedback-error"))

    def fill_otp(self, otp: str) -> None:
        inp = self.otp_input()
        inp.clear()
        inp.send_keys(otp)
        inp.send_keys("\n")

    def submit_otp(self, otp: str) -> None:
        inp = self.otp_input()
        inp.clear()
        inp.send_keys(otp)
        self.submit_otp_button().click()

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(
            self._driver,
            (
                "css selector",
                'input[autocomplete="one-time-code"], input[name*="code"], input[name*="otp"]',
            ),
            timeout,
        )

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(
            self._driver,
            (
                "css selector",
                'input[autocomplete="one-time-code"], input[name*="code"], input[name*="otp"]',
            ),
            timeout,
        )
