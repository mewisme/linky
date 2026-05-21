import re
import time

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from linky_e2e.config import settings
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.locators import by_role, by_test_id
from linky_e2e.helpers.pace import AUTH_STEP, pause
from linky_e2e.helpers.waits import (
    assert_not_visible_error,
    poll_until,
    wait_for_clerk_ready,
    wait_for_redirect_to_home,
    wait_url_matches,
    wait_visible,
)
from linky_e2e.page_objects.auth.identifier_page import IdentifierPage
from linky_e2e.page_objects.auth.otp_page import OTPPage
from linky_e2e.page_objects.auth.password_page import PasswordPage
from linky_e2e.page_objects.auth.sign_in_steps import (
    advance_to_factor_two,
    fill_email_and_continue,
    navigate_and_wait_for_clerk,
    sign_in_and_redirect_home,
    submit_otp_code,
)
from linky_e2e.test_data.clerk_test_auth import CLERK_TEST_OTP
from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.fixtures.auth_flow import create_authenticated_driver

pytestmark = pytest.mark.auth


def test_si_01_valid_email_password_mfa_redirect_home(driver):
    user = TEST_USERS["user1"]
    sign_in_and_redirect_home(driver, user.email, user.password)
    assert_not_visible_error(driver)


def test_si_02_already_signed_in_redirects_home():
    d = create_cloak_driver()
    try:
        create_authenticated_driver(d, TEST_USERS["user1"])
        d.get(f"{settings.base_url}/sign-in")
        wait_for_clerk_ready(d)
        assert poll_until(
            lambda: "/sign-in" not in d.current_url.split("?")[0],
            timeout=8,
        )
    finally:
        quit_driver(d)


def test_si_03_redirect_url_honoured(driver):
    user = TEST_USERS["user1"]
    driver.get(f"{settings.base_url}/sign-in?redirect_url=%2Fuser%2Fprofile")
    sign_in_and_redirect_home(driver, user.email, user.password, home_timeout=20)
    assert_not_visible_error(driver)
    wait_url_matches(driver, r"/user/profile", timeout=20)


def test_si_04_invalid_redirect_url_falls_back(driver):
    user = TEST_USERS["user1"]
    driver.get(f"{settings.base_url}/sign-in?redirect_url=https%3A%2F%2Fevil.example.com")
    sign_in_and_redirect_home(driver, user.email, user.password)
    assert_not_visible_error(driver)


def test_si_05_empty_email_validation(driver):
    navigate_and_wait_for_clerk(driver)
    by_role(driver, "button", name=re.compile(r"continue", re.I)).click()
    err = driver.find_elements(By.CSS_SELECTOR, '[data-testid="form-feedback-error"], #error-identifier')
    assert any(e.is_displayed() for e in err)


def test_si_06_malformed_email_validation(driver):
    navigate_and_wait_for_clerk(driver)
    page = IdentifierPage(driver)
    page.wait_until_visible()
    inp = page.email_input()
    inp.clear()
    inp.send_keys("notanemail\n")
    pause(AUTH_STEP)
    err = driver.find_elements(By.CSS_SELECTOR, '[data-testid="form-feedback-error"], #error-identifier')
    if not any(e.is_displayed() for e in err):
        msg = driver.execute_script("return arguments[0].validationMessage;", inp)
        assert msg and len(msg) > 0


def test_si_07_nonexistent_email_error(driver):
    navigate_and_wait_for_clerk(driver)
    fill_email_and_continue(driver, f"nonexistent_{int(time.time())}@example.com")
    page = IdentifierPage(driver)
    wait_visible(driver, by_test_id("form-feedback-error"), 10)
    _contains_text(page.error_message(), r"couldn't find your account|no account found|doesn't exist")


def test_si_08_wrong_password_error(driver):
    user = TEST_USERS["user1"]
    navigate_and_wait_for_clerk(driver)
    fill_email_and_continue(driver, user.email)
    pw = PasswordPage(driver)
    pw.wait_until_visible()
    inp = pw.password_input()
    inp.clear()
    inp.send_keys("wrongpassword123")
    pw.continue_button().click()
    err = driver.find_elements(By.CSS_SELECTOR, "#error-password, [data-testid='form-feedback-error']")
    visible = [e for e in err if e.is_displayed()]
    assert visible
    _contains_text(visible[0], r"incorrect|invalid|wrong")


def test_si_09_wrong_totp_error(driver):
    user = TEST_USERS["user1"]
    advance_to_factor_two(driver, user.email, user.password)
    submit_otp_code(driver, "000000")
    wait_visible(driver, by_test_id("form-feedback-error"), 10)


def test_si_10_back_from_password_to_identifier(driver):
    user = TEST_USERS["user1"]
    navigate_and_wait_for_clerk(driver)
    fill_email_and_continue(driver, user.email)
    PasswordPage(driver).wait_until_visible()
    try:
        by_role(driver, "button", name=re.compile(r"edit", re.I)).click()
    except Exception:
        driver.back()
    IdentifierPage(driver).wait_until_visible()


def test_si_11_vietnamese_locale_sign_in(driver):
    driver.get(f"{settings.base_url}/vi/sign-in")
    wait_for_clerk_ready(driver)
    IdentifierPage(driver).wait_until_visible(10)


def _contains_text(el, pattern: str) -> None:
    text = el.text or ""
    assert re.search(pattern, text, re.I), text
