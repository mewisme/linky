from __future__ import annotations

import pytest

from linky_e2e.config import settings
from linky_e2e.helpers.axe import assert_no_critical_violations, inject_axe, run_axe
from linky_e2e.helpers.waits import wait_for_clerk_ready

pytestmark = pytest.mark.auth


def test_a11y_01_sign_in_no_critical_aria_violations(driver):
    """Accessibility Smoke Checks: A11Y-01 · P2 — Sign-in page has no critical ARIA violations"""
    """Accessibility Smoke Checks: A11Y-01 · P2 — Sign-in page has no critical ARIA violations"""
    driver.get(f"{settings.base_url}/sign-in")
    wait_for_clerk_ready(driver)
    inject_axe(driver)
    results = run_axe(driver)
    assert_no_critical_violations(results, "/sign-in")


def test_a11y_02_sign_up_no_critical_aria_violations(driver):
    """Accessibility Smoke Checks: A11Y-02 · P2 — Sign-up page has no critical ARIA violations"""
    """Accessibility Smoke Checks: A11Y-02 · P2 — Sign-up page has no critical ARIA violations"""
    driver.get(f"{settings.base_url}/sign-up")
    wait_for_clerk_ready(driver)
    inject_axe(driver)
    results = run_axe(driver)
    assert_no_critical_violations(results, "/sign-up")
