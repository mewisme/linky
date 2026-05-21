from __future__ import annotations

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.waits import wait_hidden, wait_visible

_OTP_INPUT_CSS = (
    'input[autocomplete="one-time-code"], input[name*="code"], '
    'input[name*="otp"], input[inputmode="numeric"]'
)
_OTP_INPUT_LOCATOR = ("css selector", _OTP_INPUT_CSS)
_OTP_ERROR_MESSAGE_CSS = '[data-testid="form-feedback-error"], #error-undefined, input#error-undefined'
_OTP_ERROR_MESSAGE_LOCATOR = ("css selector", _OTP_ERROR_MESSAGE_CSS)


class OTPPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def otp_input(self):
        return self._driver.find_element(*_OTP_INPUT_LOCATOR)

    def error_message(self):
        return self._driver.find_element(*_OTP_ERROR_MESSAGE_LOCATOR)

    def fill_otp(self, otp: str) -> None:
        inp = self.otp_input()
        inp.clear()
        inp.send_keys(otp)

    def submit_otp(self, otp: str) -> None:
        self.fill_otp(otp)

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _OTP_INPUT_LOCATOR, timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, _OTP_INPUT_LOCATOR, timeout)

    def wait_until_error_message_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _OTP_ERROR_MESSAGE_LOCATOR, timeout)