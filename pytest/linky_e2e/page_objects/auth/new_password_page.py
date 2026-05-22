from __future__ import annotations

import re

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role, first_visible_css
from linky_e2e.helpers.waits import wait_hidden, wait_visible

_NEW_PASSWORD_CSS = 'input[name="newPassword"], input#newPassword-field'
_CONFIRM_PASSWORD_CSS = 'input[name="confirmPassword"], input#confirmPassword-field'
_NEW_PASSWORD_LOCATOR = ("css selector", _NEW_PASSWORD_CSS)
_CONFIRM_PASSWORD_LOCATOR = ("css selector", _CONFIRM_PASSWORD_CSS)

_SUBMIT_BUTTON_CSS = '[data-localization-key="taskResetPassword.formButtonPrimary"]'
_SUBMIT_BUTTON_LOCATOR = ("css selector", _SUBMIT_BUTTON_CSS)

_ERROR_NEW_PASSWORD_CSS = '#error-newPassword, [data-testid="form-feedback-error"]'
_ERROR_CONFIRM_PASSWORD_CSS = '#error-confirmPassword, [data-testid="form-feedback-error"]'
_ERROR_NEW_PASSWORD_LOCATOR = ("css selector", _ERROR_NEW_PASSWORD_CSS)
_ERROR_CONFIRM_PASSWORD_LOCATOR = ("css selector", _ERROR_CONFIRM_PASSWORD_CSS)

_PASSWORD_SUCCESS_CSS = "#newPassword-success-feedback, #password-success-feedback"
_CONFIRM_SUCCESS_CSS = "#confirmPassword-success-feedback"


class NewPasswordPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def new_password_input(self):
        el = first_visible_css(self._driver, _NEW_PASSWORD_CSS)
        if el is not None:
            return el
        return by_role(self._driver, "textbox", name=re.compile(r"new password", re.I))

    def confirm_password_input(self):
        el = first_visible_css(self._driver, _CONFIRM_PASSWORD_CSS)
        if el is not None:
            return el
        return by_role(self._driver, "textbox", name=re.compile(r"confirm password", re.I))

    def reset_password_button(self):
        return self._driver.find_element(*_SUBMIT_BUTTON_LOCATOR)

    def password_success_feedback(self):
        return self._driver.find_element("css selector", _PASSWORD_SUCCESS_CSS)

    def confirm_password_success_feedback(self):
        return self._driver.find_element("css selector", _CONFIRM_SUCCESS_CSS)

    def error_new_password_message(self):
        return self._driver.find_element(*_ERROR_NEW_PASSWORD_LOCATOR)

    def error_confirm_password_message(self):
        return self._driver.find_element(*_ERROR_CONFIRM_PASSWORD_LOCATOR)

    def form_feedback_error_message(self):
        return self._driver.find_element("css selector", '[data-testid="form-feedback-error"]')

    def fill_new_password(self, new_password: str) -> None:
        inp = self.new_password_input()
        inp.clear()
        inp.send_keys(new_password)

    def fill_confirm_password(self, confirm_password: str) -> None:
        inp = self.confirm_password_input()
        inp.clear()
        inp.send_keys(confirm_password)

    def submit_reset_password(self) -> None:
        self.reset_password_button().click()

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _NEW_PASSWORD_LOCATOR, timeout)
        wait_visible(self._driver, _CONFIRM_PASSWORD_LOCATOR, timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, _NEW_PASSWORD_LOCATOR, timeout)
        wait_hidden(self._driver, _CONFIRM_PASSWORD_LOCATOR, timeout)

    def wait_until_error_new_password_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _ERROR_NEW_PASSWORD_LOCATOR, timeout)

    def wait_until_error_confirm_password_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, _ERROR_CONFIRM_PASSWORD_LOCATOR, timeout)
