from __future__ import annotations

import re
import time

from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS, TestUser
from linky_e2e.helpers.locators import by_role
from linky_e2e.helpers.waits import wait_for_clerk_ready
from linky_e2e.page_objects.auth.security_page import SecurityPage


def open_security_page(driver: WebDriver, user: TestUser | None = None) -> SecurityPage:
    create_authenticated_driver(driver, user or TEST_USERS["user1"])
    driver.get(f"{settings.base_url}/user/security")
    wait_for_clerk_ready(driver)
    return SecurityPage(driver)


def click_sign_out(driver: WebDriver) -> None:
    avatar = driver.find_elements(
        By.CSS_SELECTOR,
        '[data-testid="user-button"], [data-testid="avatar-trigger"], '
        '[aria-label*="user menu"], [aria-label*="account"], '
        'button[class*="avatar"], button[class*="user"]',
    )
    if not avatar:
        raise AssertionError("User menu trigger not found")
    avatar[0].click()

    logout = driver.find_elements(
        By.XPATH,
        "//*[@role='menuitem' or self::button][contains("
        "translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
        "'logout') or contains("
        "translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
        "'sign out')]",
    )
    if not logout:
        logout = driver.find_elements(
            By.XPATH,
            "//*[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'logout') "
            "or contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sign out')]",
        )
    deadline = time.time() + 5
    visible = []
    while time.time() < deadline:
        visible = [el for el in logout if el.is_displayed()]
        if visible:
            break
        time.sleep(0.2)
        logout = driver.find_elements(
            By.XPATH,
            "//*[@role='menuitem' or self::button][contains("
            "translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'logout') or contains("
            "translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            "'sign out')]",
        )
    if not visible:
        raise AssertionError("Sign out menu item not visible")
    visible[0].click()


def press_sign_out_shortcut(driver: WebDriver) -> None:
    ActionChains(driver).key_down(Keys.CONTROL).key_down(Keys.SHIFT).send_keys("q").key_up(
        Keys.SHIFT
    ).key_up(Keys.CONTROL).perform()


def wait_for_network_idle(driver: WebDriver, settle_sec: float = 1.5) -> None:
    time.sleep(settle_sec)
