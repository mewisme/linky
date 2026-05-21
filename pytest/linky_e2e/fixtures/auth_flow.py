from __future__ import annotations

import time

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.fixtures.users import TestUser
from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_for_redirect_to_home
from linky_e2e.test_data.clerk_test_auth import resolve_test_otp
from linky_e2e.page_objects.auth.identifier_page import IdentifierPage
from linky_e2e.page_objects.auth.otp_page import OTPPage
from linky_e2e.page_objects.auth.password_page import PasswordPage
from linky_e2e.storage.state import load_storage_state, save_storage_state


def authenticate_user(driver: WebDriver, user: TestUser) -> None:
    from linky_e2e.config import settings

    driver.get(f"{settings.base_url}/sign-in")
    wait_for_clerk_ready(driver)
    time.sleep(1)

    identifier = IdentifierPage(driver)
    identifier.wait_until_visible()
    identifier.submit_email(user.email)
    identifier.wait_until_hidden()

    password = PasswordPage(driver)
    time.sleep(1)
    password.wait_until_visible()
    password.submit_password(user.password)
    password.wait_until_hidden()

    if "factor-two" in driver.current_url:
        otp = OTPPage(driver)
        otp.wait_until_visible()
        time.sleep(1)
        otp.fill_otp(resolve_test_otp(user.otp))
        otp.wait_until_hidden()

    time.sleep(1)
    wait_for_redirect_to_home(driver, 20)


def create_authenticated_driver(driver: WebDriver, user: TestUser) -> WebDriver:
    load_storage_state(driver, user.storage_state_path)
    return driver


def refresh_storage_state_for_user(driver: WebDriver, user: TestUser) -> None:
    authenticate_user(driver, user)
    save_storage_state(driver, user.storage_state_path)
