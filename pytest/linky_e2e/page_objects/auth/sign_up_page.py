from __future__ import annotations

import re

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_role, by_test_id
from linky_e2e.helpers.waits import wait_hidden, wait_visible


class SignUpPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def first_name_input(self):
        return by_role(self._driver, "textbox", name=re.compile(r"first name", re.I))

    def last_name_input(self):
        return by_role(self._driver, "textbox", name=re.compile(r"last name", re.I))

    def email_address_input(self):
        return by_role(self._driver, "textbox", name=re.compile(r"email address", re.I))

    def password_input(self):
        try:
            return by_role(self._driver, "textbox", name=re.compile(r"password", re.I))
        except Exception:
            return self._driver.find_element(By.CSS_SELECTOR, 'input[type="password"]')

    def checkbox_input(self):
        return self._driver.find_element(
            By.XPATH,
            "//input[@type='checkbox' and contains("
            "translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'terms')]",
        )

    def sign_up_button(self):
        return by_role(self._driver, "button", name=re.compile(r"continue", re.I))

    def error_email_message(self):
        return self._driver.find_element(By.CSS_SELECTOR, "#error-emailAddress")

    def error_password_message(self):
        return self._driver.find_element(By.CSS_SELECTOR, "#error-password")

    def form_feedback_error_message(self):
        return self._driver.find_element(*by_test_id("form-feedback-error"))

    def fill_first_name(self, first_name: str) -> None:
        inp = self.first_name_input()
        inp.clear()
        inp.send_keys(first_name)

    def fill_last_name(self, last_name: str) -> None:
        inp = self.last_name_input()
        inp.clear()
        inp.send_keys(last_name)

    def fill_email_address(self, email_address: str) -> None:
        inp = self.email_address_input()
        inp.clear()
        inp.send_keys(email_address)

    def fill_password(self, password: str) -> None:
        inp = self.password_input()
        inp.clear()
        inp.send_keys(password)

    def fill_checkbox(self) -> None:
        cb = self.checkbox_input()
        if not cb.is_selected():
            cb.click()

    def uncheck_checkbox(self) -> None:
        cb = self.checkbox_input()
        if cb.is_selected():
            cb.click()

    def submit_sign_up(self) -> None:
        self.sign_up_button().click()

    def wait_until_visible(self, timeout: float | None = None) -> None:
        wait_visible(self._driver, ("css selector", 'input[name="firstName"], input[autocomplete="given-name"]'), timeout)
        wait_visible(self._driver, ("css selector", 'input[name="lastName"], input[autocomplete="family-name"]'), timeout)
        wait_visible(self._driver, ("css selector", 'input[name="emailAddress"], input[name="email"]'), timeout)
        wait_visible(self._driver, ("css selector", 'input[type="password"]'), timeout)

    def wait_until_hidden(self, timeout: float | None = None) -> None:
        wait_hidden(self._driver, ("css selector", 'input[name="firstName"], input[autocomplete="given-name"]'), timeout)
