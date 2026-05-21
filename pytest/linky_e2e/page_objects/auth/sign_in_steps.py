from __future__ import annotations

import time

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_for_redirect_to_home, wait_url_matches
from linky_e2e.page_objects.auth.identifier_page import IdentifierPage
from linky_e2e.page_objects.auth.otp_page import OTPPage
from linky_e2e.page_objects.auth.password_page import PasswordPage
from linky_e2e.test_data.clerk_test_auth import CLERK_TEST_OTP, resolve_test_otp


def navigate_and_wait_for_clerk(driver: WebDriver, path: str = "/sign-in") -> None:
    from linky_e2e.config import settings

    driver.get(f"{settings.base_url}{path}")
    wait_for_clerk_ready(driver)


def fill_email_and_continue(driver: WebDriver, email: str) -> None:
    page = IdentifierPage(driver)
    page.wait_until_visible()
    page.submit_email(email)


def fill_password_and_continue(driver: WebDriver, password: str) -> None:
    page = PasswordPage(driver)
    page.wait_until_visible()
    page.submit_password(password)


def sign_in_with_credentials(driver: WebDriver, email: str, password: str) -> None:
    navigate_and_wait_for_clerk(driver)
    fill_email_and_continue(driver, email)
    fill_password_and_continue(driver, password)


def advance_to_factor_two(driver: WebDriver, email: str, password: str) -> None:
    sign_in_with_credentials(driver, email, password)
    wait_url_matches(driver, r"sign-in/factor-two", timeout=15)


def submit_otp_code(driver: WebDriver, code: str | None = None, _depth: int = 0) -> None:
    otp = resolve_test_otp(code)
    if _depth > 3:
        return
    if "factor-two" in driver.current_url:
        OTPPage(driver).fill_otp(otp)
    time.sleep(5)
    try:
        alert = driver.find_element("css selector", "p.cl-alertText")
        if alert.is_displayed() and alert.get_attribute("data-color") == "danger":
            submit_otp_code(driver, otp, _depth + 1)
    except Exception:
        pass


def sign_in_and_redirect_home(
    driver: WebDriver,
    email: str,
    password: str,
    *,
    otp: str | None = None,
    home_timeout: float = 20,
) -> None:
    advance_to_factor_two(driver, email, password)
    submit_otp_code(driver, otp)
    wait_for_redirect_to_home(driver, home_timeout)
