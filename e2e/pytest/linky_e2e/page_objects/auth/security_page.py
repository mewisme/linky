from __future__ import annotations

import re

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.locators import by_test_id, find_by_test_id
from linky_e2e.helpers.waits import wait_present, wait_visible


class SecurityPage:
    def __init__(self, driver: WebDriver) -> None:
        self._driver = driver

    def authentication_card(self):
        return find_by_test_id(self._driver, "security-authentication-card")

    def change_password_button(self):
        return find_by_test_id(self._driver, "security-password-open-dialog")

    def dialog_container(self):
        return find_by_test_id(self._driver, "dialog-container")

    def drawer_container(self):
        return find_by_test_id(self._driver, "drawer-container")

    def _password_modal(self):
        try:
            return self.dialog_container()
        except Exception:
            return self.drawer_container()

    def new_password_input(self):
        modal = self._password_modal()
        return modal.find_element(
            By.CSS_SELECTOR,
            'input[type="password"], input[type="text"]',
        )

    def confirm_password_input(self):
        modal = self._password_modal()
        inputs = modal.find_elements(By.CSS_SELECTOR, 'input[type="password"], input[type="text"]')
        if len(inputs) < 2:
            raise Exception("Confirm password input not found in password modal")
        return inputs[1]

    def update_password_button(self):
        return find_by_test_id(self._driver, "security-password-submit")

    def cancel_button(self):
        return find_by_test_id(self._driver, "dialog-cancel-button")

    def sign_out_others_checkbox(self):
        return find_by_test_id(self._driver, "security-password-sign-out-others")

    def active_sessions_list(self):
        return self._driver.find_element(By.CSS_SELECTOR, "#active-sessions-list")

    def view_all_sessions_button(self):
        return self._driver.find_element(
            By.CSS_SELECTOR,
            'button[aria-controls="active-sessions-list"]',
        )

    def password_strength_label(self):
        return self._driver.find_element(
            By.XPATH,
            "//p[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'strength')]",
        )

    def open_change_password_dialog(self) -> None:
        self.change_password_button().click()
        try:
            wait_visible(self._driver, by_test_id("dialog-container"), 10)
        except Exception:
            wait_visible(self._driver, by_test_id("drawer-container"), 10)

    def wait_for_sessions_loaded(self) -> None:
        wait_present(
            self._driver,
            (By.CSS_SELECTOR, '#active-sessions-list [role="listitem"]'),
            15,
        )
