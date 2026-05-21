from __future__ import annotations

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.test_data.clerk_test_auth import (
    DEFAULT_TEST_PASSWORD,
    clerk_test_email,
    resolve_test_otp,
)
from linky_e2e.helpers.waits import wait_for_redirect_to_home, wait_url_matches
from linky_e2e.page_objects.auth.otp_page import OTPPage
from linky_e2e.page_objects.auth.sign_in_steps import (
    navigate_and_wait_for_clerk,
    sign_in_and_redirect_home,
    submit_otp_code,
)
from linky_e2e.page_objects.auth.sign_up_page import SignUpPage


def submit_clerk_otp(driver: WebDriver, otp: str | None = None) -> None:
    submit_otp_code(driver, resolve_test_otp(otp))


def sign_up_and_redirect_home(
    driver: WebDriver,
    *,
    name: str | None = None,
    password: str = DEFAULT_TEST_PASSWORD,
    first_name: str = "Test",
    last_name: str = "User",
    otp: str | None = None,
    home_timeout: float = 30,
) -> str:
    email = clerk_test_email(name)
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    sign_up.fill_first_name(first_name)
    sign_up.fill_last_name(last_name)
    sign_up.fill_email_address(email)
    sign_up.fill_password(password)
    sign_up.fill_checkbox()
    sign_up.submit_sign_up()
    wait_url_matches(driver, r"sign-up/verify-email-address", timeout=20)
    otp_page = OTPPage(driver)
    otp_page.wait_until_visible()
    otp_page.fill_otp(resolve_test_otp(otp))
    wait_for_redirect_to_home(driver, home_timeout)
    return email
