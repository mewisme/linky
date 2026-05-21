from __future__ import annotations

import re

import pytest
from selenium.webdriver.common.by import By

from linky_e2e.helpers.auth_ui import open_security_page
from linky_e2e.helpers.pace import AUTH_STEP, OAUTH_WAIT, pause
from linky_e2e.helpers.waits import wait_visible

pytestmark = pytest.mark.auth


def _provider_visible(driver) -> bool:
    oauth = driver.find_elements(
        By.CSS_SELECTOR,
        '[data-provider], [data-testid*="provider"], '
        '[aria-label*="Google"], [aria-label*="Facebook"], [aria-label*="Discord"]',
    )
    if any(el.is_displayed() for el in oauth):
        return True
    text = driver.find_element(By.TAG_NAME, "body").text
    return bool(re.search(r"google|facebook|discord", text, re.I))


def test_oa_01_connected_providers_listed(driver):
    """Connected OAuth Providers: OA-01 · P1 — Connected providers listed in authentication card"""
    """Connected OAuth Providers: OA-01 · P1 — Connected providers listed in authentication card"""
    open_security_page(driver)
    wait_visible(driver, ("css selector", '[data-testid="security-authentication-card"]'), 15)
    assert _provider_visible(driver)


def test_oa_02_click_unlinked_provider_triggers_oauth(driver):
    """Connected OAuth Providers: OA-02 · P1 — Click unlinked provider → triggers OAuth redirect"""
    """Connected OAuth Providers: OA-02 · P1 — Click unlinked provider → triggers OAuth redirect"""
    open_security_page(driver)
    wait_visible(driver, ("css selector", '[data-testid="security-authentication-card"]'), 15)
    connect = driver.find_elements(
        By.XPATH,
        "//button[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'connect')]",
    )
    visible = [el for el in connect if el.is_displayed()]
    if not visible:
        pytest.skip("No unlinked providers found for user1 — all providers already connected.")
    handles_before = set(driver.window_handles)
    visible[0].click()
    pause(OAUTH_WAIT)
    handles_after = set(driver.window_handles)
    redirected = "/user/security" not in driver.current_url
    assert len(handles_after) > len(handles_before) or redirected


def test_oa_03_click_linked_provider_disconnect_dialog(driver):
    """Connected OAuth Providers: OA-03 · P1 — Click linked provider → disconnect confirm dialog appears"""
    """Connected OAuth Providers: OA-03 · P1 — Click linked provider → disconnect confirm dialog appears"""
    open_security_page(driver)
    wait_visible(driver, ("css selector", '[data-testid="security-authentication-card"]'), 15)
    linked = driver.find_elements(
        By.CSS_SELECTOR,
        '[data-testid*="provider-connected"], [aria-label*="Disconnect"], [data-connected="true"]',
    )
    visible = [el for el in linked if el.is_displayed()]
    if not visible:
        cards = driver.find_elements(
            By.XPATH,
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'google') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'facebook') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'discord')]",
        )
        cards = [el for el in cards if el.is_displayed()]
        assert cards, "No provider cards found"
        from selenium.webdriver.common.action_chains import ActionChains

        ActionChains(driver).move_to_element(cards[0]).perform()
    else:
        visible[0].click()
    wait_visible(
        driver,
        (
            "xpath",
            "//*[@role='alertdialog' or @role='dialog'][contains("
            "translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'disconnect')]",
        ),
        10,
    )


def test_oa_04_cancel_disconnect_keeps_provider(driver):
    """Connected OAuth Providers: OA-04 · P1 — Cancel disconnect keeps provider connected"""
    """Connected OAuth Providers: OA-04 · P1 — Cancel disconnect keeps provider connected"""
    open_security_page(driver)
    wait_visible(driver, ("css selector", '[data-testid="security-authentication-card"]'), 15)
    linked = driver.find_elements(
        By.CSS_SELECTOR,
        '[data-testid*="provider-connected"], [aria-label*="Disconnect"], [data-connected="true"]',
    )
    visible = [el for el in linked if el.is_displayed()]
    if not visible:
        pytest.skip("No linked provider found for user1 — cannot test disconnect cancel.")
    visible[0].click()
    cancel = driver.find_elements(
        By.XPATH,
        "//button[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'keep connected') "
        "or contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'cancel')]",
    )
    visible_cancel = [el for el in cancel if el.is_displayed()]
    assert visible_cancel, "Cancel button not found in disconnect dialog"
    visible_cancel[0].click()
    pause(AUTH_STEP)
    dialogs = driver.find_elements(By.CSS_SELECTOR, '[role="alertdialog"]')
    assert not any(d.is_displayed() for d in dialogs)


def test_oa_05_confirm_disconnect_reverification_modal(driver):
    """Connected OAuth Providers: OA-05 · P2 — Confirm disconnect calls Clerk destroy with re-verification"""
    """Connected OAuth Providers: OA-05 · P2 — Confirm disconnect calls Clerk destroy with re-verification"""
    open_security_page(driver)
    wait_visible(driver, ("css selector", '[data-testid="security-authentication-card"]'), 15)
    linked = driver.find_elements(
        By.CSS_SELECTOR,
        '[data-testid*="provider-connected"], [aria-label*="Disconnect"], [data-connected="true"]',
    )
    visible = [el for el in linked if el.is_displayed()]
    if not visible:
        pytest.skip("No linked provider found for user1 — cannot test disconnect reverification.")
    visible[0].click()
    confirm = driver.find_elements(
        By.XPATH,
        "//button[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'yes') "
        "and contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'disconnect')]"
        " | //button[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'disconnect')]",
    )
    visible_confirm = [el for el in confirm if el.is_displayed()]
    assert visible_confirm, "Confirm disconnect button not found"
    visible_confirm[0].click()
    wait_visible(
        driver,
        (
            "css selector",
            '[data-clerk-modal="reverification"], [role="dialog"][class*="clerk"], [class*="reverification"]',
        ),
        15,
    )
