from __future__ import annotations

import os

import pytest

from linky_e2e.helpers.waits import wait_for_redirect_to_home, wait_hidden, wait_visible
from linky_e2e.page_objects.auth.new_password_page import NewPasswordPage
from linky_e2e.page_objects.auth.otp_page import OTPPage
from linky_e2e.page_objects.auth.password_page import PasswordPage
from linky_e2e.page_objects.auth.reset_password_page import ResetPasswordPage
from linky_e2e.page_objects.auth.sign_in_steps import fill_email_and_continue, navigate_and_wait_for_clerk

pytestmark = pytest.mark.auth

BREACH_EMAIL = os.environ.get("BREACH_TEST_EMAIL", "").strip()
BREACH_PASSWORD = os.environ.get("BREACH_TEST_PASSWORD", "password123").strip()
BREACH_OTP = os.environ.get("BREACH_TEST_OTP", "").strip()
HAS_BREACH = bool(BREACH_EMAIL)


def _sign_in_with_breached_account(driver) -> None:
    navigate_and_wait_for_clerk(driver)
    fill_email_and_continue(driver, BREACH_EMAIL)
    password = PasswordPage(driver)
    password.wait_until_visible()
    password.submit_password(BREACH_PASSWORD)


@pytest.mark.skipif(not HAS_BREACH, reason="BREACH_TEST_EMAIL env var not set.")
def test_br_01_breach_interstitial_displayed(driver):
    """Sign-In Breach Interstitial: BR-01 · P0 — Breach interstitial displayed on compromised password"""
    """Sign-In Breach Interstitial: BR-01 · P0 — Breach interstitial displayed on compromised password"""
    _sign_in_with_breached_account(driver)
    reset = ResetPasswordPage(driver)
    wait_visible(
        driver,
        (
            "xpath",
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'password has been found as part of a breach')]",
        ),
        15,
    )
    assert reset.reset_password_button().is_displayed()


@pytest.mark.skipif(not HAS_BREACH, reason="BREACH_TEST_EMAIL env var not set.")
def test_br_02_reset_password_transitions_to_otp(driver):
    """Sign-In Breach Interstitial: BR-02 · P0 — Clicking "Reset your password" → transitions to OTP/email step"""
    """Sign-In Breach Interstitial: BR-02 · P0 — Clicking"""
    _sign_in_with_breached_account(driver)
    reset = ResetPasswordPage(driver)
    wait_visible(
        driver,
        (
            "xpath",
            "//button[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'reset your password')]",
        ),
        15,
    )
    reset.submit_reset_password()
    wait_hidden(
        driver,
        (
            "xpath",
            "//button[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'reset your password')]",
        ),
        10,
    )
    OTPPage(driver).wait_until_visible(10)


@pytest.mark.skipif(not HAS_BREACH, reason="BREACH_TEST_EMAIL env var not set.")
def test_br_03_wrong_otp_on_breach_reset_error(driver):
    """Sign-In Breach Interstitial: BR-03 · P0 — Wrong OTP on breach reset → error"""
    """Sign-In Breach Interstitial: BR-03 · P0 — Wrong OTP on breach reset → error"""
    _sign_in_with_breached_account(driver)
    reset = ResetPasswordPage(driver)
    wait_visible(
        driver,
        (
            "xpath",
            "//button[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'reset your password')]",
        ),
        15,
    )
    reset.submit_reset_password()
    otp = OTPPage(driver)
    otp.wait_until_visible(10)
    otp.otp_input().send_keys("000000")
    otp.submit_otp_button().click()
    wait_visible(driver, ("css selector", '[data-testid="form-feedback-error"]'), 10)


@pytest.mark.skipif(not HAS_BREACH, reason="BREACH_TEST_EMAIL env var not set.")
@pytest.mark.skipif(not BREACH_OTP, reason="BREACH_TEST_OTP env var not set.")
def test_br_04_correct_otp_new_password_success(driver):
    """Sign-In Breach Interstitial: BR-04 · P1 — Correct OTP → proceeds to new-password step → success"""
    """Sign-In Breach Interstitial: BR-04 · P1 — Correct OTP → proceeds to new-password step → success"""
    _sign_in_with_breached_account(driver)
    reset = ResetPasswordPage(driver)
    wait_visible(
        driver,
        (
            "xpath",
            "//button[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'reset your password')]",
        ),
        15,
    )
    reset.submit_reset_password()
    otp = OTPPage(driver)
    otp.wait_until_visible(10)
    otp.otp_input().send_keys(BREACH_OTP)
    otp.submit_otp_button().click()
    new_pw = NewPasswordPage(driver)
    new_pw.wait_until_visible(15)
    new_pw.fill_new_password("BrandNewSecure456!")
    new_pw.fill_confirm_password("BrandNewSecure456!")
    new_pw.submit_reset_password()
    wait_for_redirect_to_home(driver, 20)
