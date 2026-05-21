from __future__ import annotations

import re
from typing import Pattern

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import authenticate_user
from linky_e2e.fixtures.users import TestUser
from linky_e2e.helpers.pace import PAGE_SETTLE, pause
from linky_e2e.helpers.waits import wait_visible


def goto_profile_authenticated(driver: WebDriver, user: TestUser) -> None:
    authenticate_user(driver, user)
    driver.get(f"{settings.base_url}/user/profile")
    driver.implicitly_wait(0)
    pause(PAGE_SETTLE)


def wait_page_loaded(driver: WebDriver, delay: float | None = None) -> None:
    WebDriverWait(driver, settings.default_timeout_sec).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )
    pause(delay if delay is not None else PAGE_SETTLE)


def set_viewport(driver: WebDriver, w: int = 1280, h: int = 720) -> None:
    driver.set_window_size(w, h)


def section(driver: WebDriver, aria_label: str) -> WebElement:
    return driver.find_element(By.CSS_SELECTOR, f'section[aria-label="{aria_label}"]')


def bio_section(driver: WebDriver) -> WebElement:
    return section(driver, "Bio")


def profile_identity_section(driver: WebDriver) -> WebElement:
    return section(driver, "Profile identity")


def personal_info_section(driver: WebDriver) -> WebElement:
    return section(driver, "Personal Info")


def interests_section(driver: WebDriver) -> WebElement:
    return section(driver, "Interests")


def hover_section(driver: WebDriver, el: WebElement) -> None:
    driver.execute_script(
        "arguments[0].dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));",
        el,
    )


def _button_in(parent: WebElement, name: str) -> WebElement:
    return parent.find_element(
        By.XPATH,
        f".//button[contains(translate(normalize-space(.), "
        f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{name.lower()}')]",
    )


def edit_button_in(parent: WebElement) -> WebElement:
    return _button_in(parent, "edit")


def save_button_in(parent: WebElement) -> WebElement:
    return _button_in(parent, "save")


def cancel_button_in(parent: WebElement) -> WebElement:
    return _button_in(parent, "cancel")


def hover_and_click_edit(driver: WebDriver, parent: WebElement) -> None:
    hover_section(driver, parent)
    edit_button_in(parent).click()


def hover_and_edit_bio(driver: WebDriver) -> None:
    hover_and_click_edit(driver, bio_section(driver))


def click_edit_in_section(section_el: WebElement) -> None:
    edit_button_in(section_el).click()


def find_by_placeholder(driver: WebDriver, pattern: str | Pattern[str]) -> WebElement:
    pat = pattern.pattern if isinstance(pattern, re.Pattern) else pattern
    pat_lower = pat.lower()
    return driver.find_element(
        By.XPATH,
        f"//input[contains(translate(@placeholder, "
        f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pat_lower}')]",
    )


def find_text(driver: WebDriver, pattern: str | Pattern[str]) -> WebElement:
    pat = pattern.pattern if isinstance(pattern, re.Pattern) else pattern
    pat_lower = pat.lower()
    return driver.find_element(
        By.XPATH,
        f"//*[contains(translate(normalize-space(.), "
        f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pat_lower}')]",
    )


def wait_for_text(driver: WebDriver, pattern: str | Pattern[str], timeout: float = 10) -> WebElement:
    pat = pattern.pattern if isinstance(pattern, re.Pattern) else pattern
    rx = re.compile(pat, re.I)

    def _found(_: WebDriver) -> WebElement | bool:
        for el in driver.find_elements(By.XPATH, "//*"):
            try:
                if el.is_displayed() and rx.search(el.text or ""):
                    return el
            except Exception:
                continue
        return False

    return WebDriverWait(driver, timeout).until(_found)


def element_visible(el: WebElement) -> bool:
    try:
        return el.is_displayed()
    except Exception:
        return False


def button_by_name(driver: WebDriver, pattern: str | Pattern[str]) -> WebElement:
    pat = pattern.pattern if isinstance(pattern, re.Pattern) else pattern
    pat_lower = pat.lower()
    return driver.find_element(
        By.XPATH,
        f"//button[contains(translate(normalize-space(.), "
        f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pat_lower}')]",
    )


def link_by_name(driver: WebDriver, pattern: str | Pattern[str]) -> WebElement:
    pat = pattern.pattern if isinstance(pattern, re.Pattern) else pattern
    pat_lower = pat.lower()
    return driver.find_element(
        By.XPATH,
        f"//a[contains(translate(normalize-space(.), "
        f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pat_lower}')]",
    )


def heading_by_name(driver: WebDriver, pattern: str | Pattern[str]) -> WebElement:
    pat = pattern.pattern if isinstance(pattern, re.Pattern) else pattern
    pat_lower = pat.lower()
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        els = driver.find_elements(
            By.XPATH,
            f"//{tag}[contains(translate(normalize-space(.), "
            f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pat_lower}')]",
        )
        for el in els:
            if el.is_displayed():
                return el
    raise Exception(f"No heading matching {pat}")


def wait_for_url(driver: WebDriver, pattern: str, timeout: float = 20) -> None:
    rx = re.compile(pattern)

    def _match(_: WebDriver) -> bool:
        return bool(rx.search(driver.current_url))

    WebDriverWait(driver, timeout).until(_match)
