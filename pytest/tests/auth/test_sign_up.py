from __future__ import annotations

import re
import time

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_for_redirect_to_home, wait_url_matches, wait_visible
from linky_e2e.page_objects.auth.otp_page import OTPPage
from linky_e2e.page_objects.auth.sign_in_steps import navigate_and_wait_for_clerk
from linky_e2e.page_objects.auth.sign_up_page import SignUpPage
from linky_e2e.test_data.clerk_test_auth import (
    CLERK_TEST_OTP,
    DEFAULT_TEST_PASSWORD,
    clerk_test_email,
)
from linky_e2e.page_objects.auth.clerk_auth_flow import sign_up_and_redirect_home
from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.config import settings

pytestmark = pytest.mark.auth


def fresh_test_email(name: str | None = None) -> str:
    return clerk_test_email(name)


def _contains_text(el, pattern: str) -> None:
    text = el.text or ""
    assert re.search(pattern, text, re.I), text


def _any_visible(driver, selectors: list[str], timeout: float = 5) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        for sel in selectors:
            for el in driver.find_elements(By.CSS_SELECTOR, sel):
                if el.is_displayed():
                    return True
        time.sleep(0.2)
    return False


def _fill_sign_up_form(sign_up: SignUpPage, *, email: str, check_terms: bool = True) -> None:
    sign_up.fill_first_name("Test")
    sign_up.fill_last_name("User")
    sign_up.fill_email_address(email)
    sign_up.fill_password(DEFAULT_TEST_PASSWORD)
    if check_terms:
        sign_up.fill_checkbox()


def _reach_verify_email(driver, sign_up: SignUpPage) -> None:
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    _fill_sign_up_form(sign_up, email=fresh_test_email())
    sign_up.submit_sign_up()
    wait_url_matches(driver, r"sign-up/verify-email-address", timeout=20)


@pytest.mark.slow
def test_su_01_valid_registration_redirect_home(driver):
    sign_up_and_redirect_home(driver)


def test_su_02_already_signed_in_form_not_shown():
    d = create_cloak_driver()
    try:
        create_authenticated_driver(d, TEST_USERS["user1"])
        d.get(f"{settings.base_url}/sign-up")
        wait_for_clerk_ready(d)
        sign_up = SignUpPage(d)
        deadline = time.time() + 5
        while time.time() < deadline:
            try:
                if not sign_up.first_name_input().is_displayed():
                    return
            except Exception:
                return
            time.sleep(0.25)
        assert not sign_up.first_name_input().is_displayed()
    finally:
        quit_driver(d)


def test_su_03_vietnamese_locale_sign_up(driver):
    driver.get(f"{settings.base_url}/vi/sign-up")
    wait_for_clerk_ready(driver)
    wait_visible(
        driver,
        ("css selector", 'input[name="firstName"], input[autocomplete="given-name"]'),
        10,
    )


def test_su_04_all_fields_blank_submit_blocked(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    sign_up.submit_sign_up()
    assert _any_visible(
        driver,
        ["#error-firstName", "#error-lastName", "#error-emailAddress", "#error-password"],
        5,
    )


def test_su_05_invalid_email_format(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    sign_up.fill_first_name("Test")
    sign_up.fill_last_name("User")
    sign_up.fill_password(DEFAULT_TEST_PASSWORD)
    sign_up.fill_checkbox()
    sign_up.fill_email_address("bademail")
    sign_up.submit_sign_up()
    try:
        wait_visible(driver, ("css selector", "#error-emailAddress"), 3)
    except Exception:
        msg = driver.execute_script(
            "return arguments[0].validationMessage;",
            sign_up.email_address_input(),
        )
        assert msg and len(msg) > 0


def test_su_06_password_too_short(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    _fill_sign_up_form(sign_up, email=fresh_test_email())
    sign_up.fill_password("abc123")
    sign_up.submit_sign_up()
    wait_visible(driver, ("css selector", "#error-password"), 5)
    _contains_text(sign_up.error_password_message(), r"8 or more characters")


def test_su_07_password_max_length_inline_error(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    _fill_sign_up_form(sign_up, email=fresh_test_email(), check_terms=True)
    sign_up.fill_password("A" * 73)
    sign_up.password_input().send_keys(Keys.TAB)
    wait_visible(driver, ("css selector", "#error-password"), 5)


def test_su_08_duplicate_email_error(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    _fill_sign_up_form(sign_up, email=TEST_USERS["user1"].email)
    sign_up.submit_sign_up()
    deadline = time.time() + 10
    while time.time() < deadline:
        for sel in ("#error-emailAddress", '[data-testid="form-feedback-error"]'):
            for el in driver.find_elements(By.CSS_SELECTOR, sel):
                if el.is_displayed():
                    _contains_text(el, r"already in use|is taken")
                    return
        time.sleep(0.25)
    raise AssertionError("Duplicate email error not shown")


def test_su_09_terms_unchecked_submit_blocked(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    _fill_sign_up_form(sign_up, email=fresh_test_email(), check_terms=False)
    sign_up.submit_sign_up()
    url = driver.current_url
    still_on_sign_up = "/sign-up" in url and "verify-email" not in url
    terms_err = _any_visible(
        driver,
        ['[name="legalAccepted"]', '[data-testid="form-feedback-error"]', "#error-legalAccepted"],
        3,
    )
    assert still_on_sign_up or terms_err


@pytest.mark.slow
def test_su_10_wrong_otp_error(driver):
    sign_up = SignUpPage(driver)
    _reach_verify_email(driver, sign_up)
    OTPPage(driver).submit_otp("123456")
    wait_visible(driver, ("css selector", '[data-testid="form-feedback-error"]'), 10)


@pytest.mark.slow
def test_su_11_empty_otp_error(driver):
    sign_up = SignUpPage(driver)
    _reach_verify_email(driver, sign_up)
    otp = OTPPage(driver)
    otp.wait_until_visible()
    otp.submit_otp_button().click()
    wait_visible(driver, ("css selector", '[data-testid="form-feedback-error"]'), 5)


@pytest.mark.slow
def test_su_12_resend_code_no_error(driver):
    sign_up = SignUpPage(driver)
    _reach_verify_email(driver, sign_up)
    resend = driver.find_elements(
        By.XPATH,
        "//button[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'resend') "
        "or contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"didn't receive\")] "
        "| //*[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'resend code')]",
    )
    visible = [el for el in resend if el.is_displayed()]
    assert visible, "Resend link not found"
    visible[0].click()
    time.sleep(1)
    err = driver.find_elements(By.CSS_SELECTOR, '[data-testid="form-feedback-error"]')
    assert not any(e.is_displayed() for e in err)


def test_su_13_oauth_google_smoke(driver):
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up = SignUpPage(driver)
    sign_up.wait_until_visible()
    google = driver.find_elements(
        By.XPATH,
        "//button[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'google')]"
        " | //*[@data-provider='google']",
    )
    visible = [el for el in google if el.is_displayed()]
    assert visible, "Google OAuth button not found"
    handles_before = set(driver.window_handles)
    visible[0].click()
    time.sleep(2)
    handles_after = set(driver.window_handles)
    url = driver.current_url.lower()
    popup_opened = len(handles_after) > len(handles_before)
    redirected = (
        "accounts.google.com" in url or "oauth" in url or "clerk" in url
    )
    assert popup_opened or redirected


@pytest.mark.slow
def test_su_14_special_characters_in_names(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    sign_up.fill_first_name("Ân")
    sign_up.fill_last_name("Nguyễn")
    sign_up.fill_email_address(fresh_test_email())
    sign_up.fill_password(DEFAULT_TEST_PASSWORD)
    sign_up.fill_checkbox()
    sign_up.submit_sign_up()
    time.sleep(2)
    for sel in ("#error-firstName", "#error-lastName"):
        err = driver.find_elements(By.CSS_SELECTOR, sel)
        assert not any(e.is_displayed() for e in err)


@pytest.mark.slow
def test_su_15_long_valid_names(driver):
    sign_up = SignUpPage(driver)
    navigate_and_wait_for_clerk(driver, "/sign-up")
    sign_up.wait_until_visible()
    sign_up.fill_first_name("A" * 50)
    sign_up.fill_last_name("B" * 50)
    sign_up.fill_email_address(fresh_test_email())
    sign_up.fill_password(DEFAULT_TEST_PASSWORD)
    sign_up.fill_checkbox()
    sign_up.submit_sign_up()
    time.sleep(2)
    for sel in ("#error-firstName", "#error-lastName"):
        err = driver.find_elements(By.CSS_SELECTOR, sel)
        assert not any(e.is_displayed() for e in err)
