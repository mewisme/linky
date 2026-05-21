from __future__ import annotations

import pytest

from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.waits import wait_for_clerk_ready, wait_url_matches
from linky_e2e.page_objects.auth.identifier_page import IdentifierPage
from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from selenium.webdriver.remote.webdriver import WebDriver

pytestmark = pytest.mark.auth


def test_rd_01_unauthenticated_protected_page_redirects_sign_in(driver: WebDriver):
    """Redirect / Middleware Guards: RD-01 · P0 — Unauthenticated user accessing protected page → redirect to sign-in"""
    driver.get(f"{settings.base_url}/user/profile")
    wait_url_matches(driver, r"/sign-in", timeout=15)


def test_rd_02_unauthenticated_sign_in_not_redirected(driver):
    """Redirect / Middleware Guards: RD-02 · P0 — Unauthenticated user accessing /sign-in is not redirected away"""
    """Redirect / Middleware Guards: RD-02 · P0 — Unauthenticated user accessing /sign-in is not redirected away"""
    driver.get(f"{settings.base_url}/sign-in")
    wait_for_clerk_ready(driver)
    IdentifierPage(driver).wait_until_visible(10)
    assert "/sign-in" in driver.current_url


def test_rd_03_api_users_me_auth_status():
    """Redirect / Middleware Guards: RD-03 · P1 — /api/* routes respect Clerk auth (200 when authenticated, 401 when not)"""
    """Redirect / Middleware Guards: RD-03 · P1 — /api/* routes respect Clerk auth (200 when authenticated, 401 when not)"""
    auth = create_cloak_driver()
    anon = create_cloak_driver()
    try:
        create_authenticated_driver(auth, TEST_USERS["user1"])
        auth.get(settings.base_url + "/")
        auth_status = auth.execute_script(
            """
            return fetch('/api/users/me', { credentials: 'include' })
              .then(r => r.status);
            """
        )
        assert auth_status == 200

        anon.get(f"{settings.base_url}/sign-in")
        anon_status = anon.execute_script(
            """
            return fetch('/api/users/me', { credentials: 'include' })
              .then(r => r.status);
            """
        )
        assert anon_status == 401
    finally:
        quit_driver(auth)
        quit_driver(anon)


def test_rd_04_unknown_auth_path_404_or_error(driver):
    """Redirect / Middleware Guards: RD-04 · P2 — 404 on unknown auth-group path"""
    """Redirect / Middleware Guards: RD-04 · P2 — 404 on unknown auth-group path"""
    import time

    from selenium.webdriver.common.by import By

    driver.get(f"{settings.base_url}/sign-in/nonexistent-step")
    deadline = time.time() + 15
    while time.time() < deadline:
        body = driver.find_element(By.TAG_NAME, "body").text.lower()
        if any(
            phrase in body
            for phrase in (
                "404",
                "not found",
                "doesn't exist",
                "something went wrong",
                "invalid",
                "expired",
            )
        ):
            return
        err = driver.find_elements(
            By.CSS_SELECTOR,
            '[data-testid="form-feedback-error"], [data-testid="not-found"]',
        )
        if any(e.is_displayed() for e in err):
            return
        time.sleep(0.3)
    raise AssertionError("Expected 404 or Clerk error state on unknown auth path")
