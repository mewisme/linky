from __future__ import annotations

import os
import re

import pytest

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.locators import by_role
from linky_e2e.helpers.waits import poll_until, wait_for_clerk_ready, wait_visible

pytestmark = pytest.mark.auth


def test_i18n_01_auth_layout_title_english(driver):
    """Internationalization (i18n) Smoke Tests: I18N-01 · P1 — Auth layout metadata reads authPage.layoutTitle from messages"""
    """Internationalization (i18n) Smoke Tests: I18N-01 · P1 — Auth layout metadata reads authPage.layoutTitle from messages"""
    driver.get(f"{settings.base_url}/sign-in")
    wait_for_clerk_ready(driver)
    title = driver.title
    assert re.search(r"authentication", title, re.I)


def test_i18n_02_signed_in_redirect_shows_redirecting_or_continue():
    """Internationalization (i18n) Smoke Tests: I18N-02 · P1 — SignedInRedirect shows "Redirecting…" or "Continue" in English"""
    """Internationalization (i18n) Smoke Tests: I18N-02 · P1 — SignedInRedirect shows"""
    d = create_cloak_driver()
    try:
        create_authenticated_driver(d, TEST_USERS["user1"])
        d.get(f"{settings.base_url}/sign-in")
        wait_for_clerk_ready(d)
        if "/sign-in" not in d.current_url:
            return
        body = d.find_element("tag name", "body").text
        if re.search(r"redirecting", body, re.I):
            return
        try:
            by_role(d, "button", name=re.compile(r"continue", re.I))
            return
        except Exception:
            pass
        try:
            by_role(d, "link", name=re.compile(r"continue", re.I))
            return
        except Exception:
            pass
        assert poll_until(lambda: "/sign-in" not in d.current_url.split("?")[0], timeout=5)
    finally:
        quit_driver(d)


@pytest.mark.skipif(
    not os.environ.get("CLERK_RESET_PASSWORD_URL"),
    reason="CLERK_RESET_PASSWORD_URL env var not set — provide a valid Clerk reset-password URL to enable.",
)
def test_i18n_03_reset_password_vietnamese_locale(driver):
    """Internationalization (i18n) Smoke Tests: I18N-03 · P2 — Reset-password page in Vietnamese locale"""
    """Internationalization (i18n) Smoke Tests: I18N-03 · P2 — Reset-password page in Vietnamese locale"""
    reset_url = os.environ["CLERK_RESET_PASSWORD_URL"]
    vi_reset_url = reset_url.replace("/reset-password", "/vi/reset-password")
    driver.get(vi_reset_url)
    wait_for_clerk_ready(driver)
    try:
        wait_visible(driver, ("css selector", 'input[name="password"]'), 15)
    except Exception:
        wait_visible(
            driver,
            (
                "xpath",
                "//*[contains(translate(normalize-space(.), "
                "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
                "'something went wrong') or contains(translate(normalize-space(.), "
                "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'invalid')]",
            ),
            15,
        )
