from __future__ import annotations

import time
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.waits import wait_hidden, wait_visible

_OTP_INPUT_CSS = (
    'input[autocomplete="one-time-code"], input[name*="code"], '
    'input[name*="otp"], input[inputmode="numeric"]'
)
_OTP_INPUT_LOCATOR = ("css selector", _OTP_INPUT_CSS)
_OTP_ERROR_MESSAGE_CSS = '[data-testid="form-feedback-error"], #error-undefined, input#error-undefined, p.cl-alertText'
_OTP_ERROR_MESSAGE_LOCATOR = ("css selector", _OTP_ERROR_MESSAGE_CSS)
_OTP_SUCCESS_MESSAGE_CSS = 'p.cl-alertText[data-color="success"], [data-feedback="success"]'
_OTP_SUCCESS_MESSAGE_LOCATOR = ("css selector", _OTP_SUCCESS_MESSAGE_CSS)


class OTPPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def otp_input(self):
        return self._driver.find_element(*_OTP_INPUT_LOCATOR)

    def error_message(self):
        return self._driver.find_element(*_OTP_ERROR_MESSAGE_LOCATOR)

    def success_message(self):
        return self._driver.find_element(*_OTP_SUCCESS_MESSAGE_LOCATOR)

    def fill_otp(self, otp: str) -> None:
        inp = self.otp_input()
        inp.clear()
        # send otp with delay of 0.1 seconds
        # if RUN_FAST is set to 0, then use 0.01 seconds, otherwise use 0.1 seconds
        from linky_e2e.config import settings
        delay = 0.01 if settings.run_fast else 0.1
        for char in otp:
          inp.send_keys(char)
          time.sleep(delay)
          
    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _OTP_INPUT_LOCATOR, timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, _OTP_INPUT_LOCATOR, timeout)

    def wait_until_error_message_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _OTP_ERROR_MESSAGE_LOCATOR, timeout)
    
    def wait_until_success_message_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _OTP_SUCCESS_MESSAGE_LOCATOR, timeout)