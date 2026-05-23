from __future__ import annotations

import re

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

from linky_e2e.helpers.auth_ui import open_security_page
from linky_e2e.helpers.locators import by_test_id
from linky_e2e.helpers.waits import wait_hidden, wait_visible
from linky_e2e.page_objects.auth.security_page import SecurityPage

pytestmark = pytest.mark.auth


def _open_dialog(driver) -> SecurityPage:
    security = open_security_page(driver)
    wait_visible(driver, by_test_id("security-authentication-card"), 15)
    security.open_change_password_dialog()
    return security


def test_sec_01_open_change_password_dialog(driver):
    """SEC-01: Open Change Password dialog."""
    security = open_security_page(driver)
    wait_visible(driver, by_test_id("security-authentication-card"), 15)
    security.change_password_button().click()
    wait_visible(
        driver,
        ("css selector", '[data-testid="dialog-container"], [data-testid="drawer-container"]'),
        5,
    )


def test_sec_02_mismatched_confirm_password_error(driver):
    """SEC-02: Mismatched confirm password shows error."""
    security = _open_dialog(driver)
    security.new_password_input().send_keys("NewValid123!")
    security.confirm_password_input().send_keys("Different456!")
    security.update_password_button().click()
    wait_visible(
        driver,
        (
            "xpath",
            "//*[@id='error-confirmPassword' or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"don't match\") "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'do not match')]",
        ),
        5,
    )


def test_sec_03_password_too_short_error(driver):
    """SEC-03: Password too short shows error."""
    security = _open_dialog(driver)
    inp = security.new_password_input()
    inp.send_keys("abc")
    inp.send_keys(Keys.TAB)
    security.update_password_button().click()
    wait_visible(
        driver,
        (
            "xpath",
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'at least 8 characters') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '8 or more characters')]",
        ),
        5,
    )


def test_sec_04_empty_new_password_error(driver):
    """SEC-04: Empty new password shows error."""
    security = _open_dialog(driver)
    security.update_password_button().click()
    wait_visible(
        driver,
        (
            "xpath",
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'required') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), \"can't be blank\") "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'enter')]",
        ),
        5,
    )


def test_sec_05_password_strength_indicator_updates(driver):
    """SEC-05: Password strength indicator updates."""
    security = _open_dialog(driver)
    inp = security.new_password_input()
    inp.send_keys("ab")
    inp.clear()
    inp.send_keys("abcdef12")
    inp.clear()
    inp.send_keys("abcdef123456!")
    wait_visible(
        driver,
        (
            "xpath",
            "//p[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'strength')]",
        ),
        5,
    )


def test_sec_06_sign_out_other_devices_checkbox_toggleable(driver):
    """SEC-06: Sign out other devices checkbox is toggleable."""
    security = _open_dialog(driver)
    cb = security.sign_out_others_checkbox()
    assert cb.is_displayed()
    assert not cb.is_selected()
    cb.click()
    assert cb.is_selected()


def test_sec_07_cancel_closes_dialog(driver):
    """SEC-07: Cancel closes dialog."""
    security = _open_dialog(driver)
    security.new_password_input().send_keys("TestPass123!")
    security.cancel_button().click()
    wait_hidden(
        driver,
        ("css selector", '[data-testid="dialog-container"], [data-testid="drawer-container"]'),
        5,
    )


@pytest.mark.skip(
    reason="Clerk reverification modal selector not yet confirmed via runtime inspection.",
)
def test_sec_08_password_change_requires_reverification(driver):
    """SEC-08: Password change requires reverification (skipped)."""
    security = _open_dialog(driver)
    security.new_password_input().send_keys("ReverifyTest123!")
    security.confirm_password_input().send_keys("ReverifyTest123!")
    security.update_password_button().click()
    wait_visible(
        driver,
        (
            "css selector",
            '[data-clerk-modal="reverification"], [role="dialog"][class*="clerk"], [class*="reverification"]',
        ),
        15,
    )


@pytest.mark.skip(reason="Requires OAuth-only test account with passwordEnabled=false.")
def test_sec_09_set_password_mode_oauth_only_user(driver):
    """SEC-09: Set Password mode for OAuth-only user (skipped)."""
    security = open_security_page(driver)
    btn = security.change_password_button()
    assert re.search(r"set password", btn.text, re.I)
    security.open_change_password_dialog()
    wait_visible(
        driver,
        (
            "xpath",
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'set') "
            "and contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'password')]",
        ),
        5,
    )


def test_sec_10_current_session_labelled_this_device(driver):
    """SEC-10: Current session labelled This device."""
    security = open_security_page(driver)
    security.wait_for_sessions_loaded()
    wait_visible(driver, (By.CSS_SELECTOR, "#active-sessions-list"), 10)
    badges = driver.find_elements(
        By.XPATH,
        "//*[normalize-space(text())='This device']",
    )
    visible = [b for b in badges if b.is_displayed()]
    assert len(visible) == 1


def test_sec_11_view_all_sessions_expands_list(driver):
    """SEC-11: View all sessions expands list."""
    security = open_security_page(driver)
    security.wait_for_sessions_loaded()
    try:
        btn = security.view_all_sessions_button()
        if not btn.is_displayed():
            pytest.skip('user1 has fewer than 3 active sessions — View all sessions not shown.')
    except Exception:
        pytest.skip('user1 has fewer than 3 active sessions — View all sessions not shown.')
    btn.click()
    wait_visible(driver, ("css selector", 'button[aria-controls="active-sessions-list"][aria-expanded="true"]'), 5)


def test_sec_12_sessions_list_shows_relative_time(driver):
    """SEC-12: Sessions list shows relative time."""
    security = open_security_page(driver)
    security.wait_for_sessions_loaded()
    wait_visible(
        driver,
        (
            "xpath",
            "//*[@id='active-sessions-list']//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'ago') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'just now') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'online')]",
        ),
        10,
    )
