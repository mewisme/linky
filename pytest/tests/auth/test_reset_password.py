from __future__ import annotations

import os
import re

import pytest

from linky_e2e.config import settings
from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_url_matches, wait_visible
from linky_e2e.page_objects.auth.new_password_page import NewPasswordPage

pytestmark = pytest.mark.auth


def _reset_password_url() -> str:
    return os.environ.get("CLERK_RESET_PASSWORD_URL", "/reset-password")


@pytest.mark.skipif(
    not os.environ.get("CLERK_RESET_PASSWORD_URL"),
    reason="CLERK_RESET_PASSWORD_URL env var not set — provide a valid Clerk reset-password URL.",
)
def test_rp_01_valid_password_redirects_security(driver):
    """Password Reset: RP-01 · P0 — Enter new valid password → success → redirect to /user/security"""
    """Password Reset: RP-01 · P0 — Enter new valid password → success → redirect to /user/security"""
    new_pw = NewPasswordPage(driver)
    driver.get(_reset_password_url())
    wait_for_clerk_ready(driver)
    new_pw.wait_until_visible()
    new_pw.fill_new_password("NewSecurePass123!")
    new_pw.fill_confirm_password("NewSecurePass123!")
    new_pw.submit_reset_password()
    wait_url_matches(driver, r"/user/security", timeout=20)


@pytest.mark.skipif(
    not os.environ.get("CLERK_RESET_PASSWORD_URL"),
    reason="CLERK_RESET_PASSWORD_URL env var not set.",
)
def test_rp_02_password_strength_feedback(driver):
    """Password Reset: RP-02 · P1 — Password field shows strength feedback while typing"""
    """Password Reset: RP-02 · P1 — Password field shows strength feedback while typing"""
    new_pw = NewPasswordPage(driver)
    driver.get(_reset_password_url())
    wait_for_clerk_ready(driver)
    new_pw.wait_until_visible()
    new_pw.new_password_input().send_keys("ValidP12")
    wait_visible(
        driver,
        (
            "css selector",
            '#password-success-feedback, [id*="password"][id*="feedback"], [class*="strength"]',
        ),
        5,
    )


@pytest.mark.skipif(
    not os.environ.get("CLERK_RESET_PASSWORD_URL"),
    reason="CLERK_RESET_PASSWORD_URL env var not set.",
)
def test_rp_03_passwords_do_not_match_error(driver):
    """Password Reset: RP-03 · P0 — Passwords do not match → inline error"""
    """Password Reset: RP-03 · P0 — Passwords do not match → inline error"""
    new_pw = NewPasswordPage(driver)
    driver.get(_reset_password_url())
    wait_for_clerk_ready(driver)
    new_pw.wait_until_visible()
    new_pw.fill_new_password("ValidPass123!")
    new_pw.fill_confirm_password("DifferentPass456!")
    new_pw.submit_reset_password()
    wait_visible(driver, ("css selector", "#error-confirmPassword"), 5)
    text = new_pw.error_confirm_password_message().text
    assert re.search(r"don't match|do not match", text, re.I)


@pytest.mark.skipif(
    not os.environ.get("CLERK_RESET_PASSWORD_URL"),
    reason="CLERK_RESET_PASSWORD_URL env var not set.",
)
def test_rp_04_short_password_error(driver):
    """Password Reset: RP-04 · P0 — Short new password (< 8 chars) → inline error"""
    """Password Reset: RP-04 · P0 — Short new password (< 8 chars) → inline error"""
    new_pw = NewPasswordPage(driver)
    driver.get(_reset_password_url())
    wait_for_clerk_ready(driver)
    new_pw.wait_until_visible()
    new_pw.fill_new_password("abc123")
    new_pw.new_password_input().send_keys("\t")
    new_pw.wait_until_error_new_password_visible(5)
    text = new_pw.error_new_password_message().text
    assert re.search(r"8 or more characters|at least 8", text, re.I)


@pytest.mark.skipif(
    not os.environ.get("CLERK_RESET_PASSWORD_URL"),
    reason="CLERK_RESET_PASSWORD_URL env var not set.",
)
def test_rp_05_breached_password_error(driver):
    """Password Reset: RP-05 · P1 — Breached password in new password → error"""
    """Password Reset: RP-05 · P1 — Breached password in new password → error"""
    new_pw = NewPasswordPage(driver)
    driver.get(_reset_password_url())
    wait_for_clerk_ready(driver)
    new_pw.wait_until_visible()
    new_pw.fill_new_password("password123")
    new_pw.fill_confirm_password("password123")
    new_pw.submit_reset_password()
    wait_visible(driver, ("css selector", '[data-testid="form-feedback-error"]'), 10)
    text = new_pw.form_feedback_error_message().text
    assert re.search(r"found as part of a breach", text, re.I)


def test_rp_06_expired_invalid_token_error(driver):
    """Password Reset: RP-06 · P2 — Expired/invalid reset token → Clerk error shown"""
    """Password Reset: RP-06 · P2 — Expired/invalid reset token → Clerk error shown"""
    driver.get(f"{settings.base_url}/reset-password")
    wait_for_clerk_ready(driver)
    wait_visible(
        driver,
        (
            "xpath",
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'expired') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'invalid') "
            "or @data-testid='form-feedback-error']",
        ),
        15,
    )
