from __future__ import annotations

import re

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role, by_test_id
from linky_e2e.helpers.waits import wait_hidden, wait_visible


class NewPasswordPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def new_password_input(self):
        return by_role(self._driver, "textbox", name=re.compile(r"new password", re.I))

    def confirm_password_input(self):
        return by_role(self._driver, "textbox", name=re.compile(r"confirm password", re.I))

    def reset_password_button(self):
        return by_role(self._driver, "button", name=re.compile(r"reset password", re.I))

    def password_success_feedback(self):
        return self._driver.find_element(By.CSS_SELECTOR, "#password-success-feedback")

    def confirm_password_success_feedback(self):
        return self._driver.find_element(By.CSS_SELECTOR, "#confirmPassword-success-feedback")

    def error_new_password_message(self):
        return self._driver.find_element(By.CSS_SELECTOR, "#error-password")

    def error_confirm_password_message(self):
        return self._driver.find_element(By.CSS_SELECTOR, "#error-confirmPassword")

    def form_feedback_error_message(self):
        return self._driver.find_element(*by_test_id("form-feedback-error"))

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
        wait_visible(
            self._driver,
            (
                "xpath",
                "//input[contains(translate(@aria-label, "
                "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'new password')]",
            ),
            timeout,
        )

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(
            self._driver,
            (
                "xpath",
                "//input[contains(translate(@aria-label, "
                "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'new password')]",
            ),
            timeout,
        )
