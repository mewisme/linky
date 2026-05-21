from __future__ import annotations

import json

import pytest

from linky_e2e.config import settings
from linky_e2e.helpers.auth_ui import (
    click_sign_out,
    press_sign_out_shortcut,
    wait_for_network_idle,
)
from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_url_matches
from linky_e2e.page_objects.auth.identifier_page import IdentifierPage

pytestmark = pytest.mark.auth


def test_so_01_sign_out_via_user_menu_redirects_sign_in(authenticated_driver):
    """Sign-Out: SO-01 · P0 — Sign out via user button dropdown → redirect to /sign-in"""
    """Sign-Out: SO-01 · P0 — Sign out via user button dropdown → redirect to /sign-in"""
    authenticated_driver.get(settings.base_url + "/")
    wait_for_network_idle(authenticated_driver)
    click_sign_out(authenticated_driver)
    wait_url_matches(authenticated_driver, r"/sign-in", timeout=15)
    wait_for_clerk_ready(authenticated_driver)
    IdentifierPage(authenticated_driver).wait_until_visible(10)


def test_so_02_keyboard_shortcut_sign_out(authenticated_driver):
    """Sign-Out: SO-02 · P0 — Keyboard shortcut Ctrl+Shift+Q triggers sign-out"""
    """Sign-Out: SO-02 · P0 — Keyboard shortcut Ctrl+Shift+Q triggers sign-out"""
    authenticated_driver.get(settings.base_url + "/")
    wait_for_network_idle(authenticated_driver)
    press_sign_out_shortcut(authenticated_driver)
    wait_url_matches(authenticated_driver, r"/sign-in", timeout=15)


def test_so_03_vietnamese_locale_sign_out_redirects_vi_sign_in(authenticated_driver):
    """Sign-Out: SO-03 · P1 — Sign-out in Vietnamese locale redirects to /vi/sign-in"""
    """Sign-Out: SO-03 · P1 — Sign-out in Vietnamese locale redirects to /vi/sign-in"""
    authenticated_driver.get(settings.base_url + "/")
    wait_for_network_idle(authenticated_driver)
    authenticated_driver.execute_script(
        "window.localStorage.setItem(arguments[0], arguments[1]);",
        "locale-preference-store",
        json.dumps({"state": {"locale": "vi"}, "version": 0}),
    )
    authenticated_driver.get(f"{settings.base_url}/vi/")
    wait_for_network_idle(authenticated_driver)
    click_sign_out(authenticated_driver)
    wait_url_matches(authenticated_driver, r"/vi/sign-in", timeout=15)
