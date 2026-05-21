from __future__ import annotations

import re
from typing import Pattern

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement


def by_test_id(test_id: str) -> tuple[str, str]:
    return (By.CSS_SELECTOR, f'[data-testid="{test_id}"]')


def find_by_test_id(driver: WebDriver, test_id: str) -> WebElement:
    return driver.find_element(*by_test_id(test_id))


_INPUT_ATTRS = ("aria-label", "name", "id", "placeholder", "autocomplete")


def _input_label_text(el: WebElement) -> str:
    parts = [el.text or ""]
    for attr in _INPUT_ATTRS:
        val = el.get_attribute(attr)
        if val:
            parts.append(val)
    return "\n".join(parts)


def _input_matches_name(el: WebElement, name: str | Pattern[str]) -> bool:
    haystack = _input_label_text(el)
    if isinstance(name, Pattern):
        return bool(name.search(haystack))
    return name.lower() in haystack.lower()


def _find_input_by_name(driver: WebDriver, name: str | Pattern[str]) -> WebElement:
    xpath = (
        "//input[(@type='text' or @type='email' or @type='password' or not(@type)) "
        "and not(@type='hidden')]"
    )
    label = name.pattern if isinstance(name, Pattern) else name
    for el in driver.find_elements(By.XPATH, xpath):
        if el.is_displayed() and _input_matches_name(el, name):
            return el
    raise Exception(f"No element role=textbox name~={label}")


def by_role(
    driver: WebDriver,
    role: str,
    *,
    name: str | Pattern[str] | None = None,
) -> WebElement:
    if role == "button":
        tag = "button"
    elif role == "textbox":
        tag = "input"
    elif role == "link":
        tag = "a"
    else:
        tag = "*"

    if name is None:
        return driver.find_element(By.TAG_NAME, tag) if tag != "*" else driver.find_element(By.XPATH, "//*")

    if tag == "input":
        return _find_input_by_name(driver, name)

    if isinstance(name, Pattern):
        pattern = name.pattern
        xpath = (
            f"//{tag}[contains(translate(normalize-space(.), "
            f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            f"'{pattern.lower()}')]"
        )
        elements = driver.find_elements(By.XPATH, xpath)
        for el in elements:
            if name.search(el.text or el.get_attribute("aria-label") or ""):
                return el
        raise Exception(f"No element role={role} name~={pattern}")

    name_lower = name.lower()
    if tag == "button":
        xpath = (
            f"//button[contains(translate(normalize-space(.), "
            f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{name_lower}')]"
        )
    elif tag == "a":
        xpath = (
            f"//a[contains(translate(normalize-space(.), "
            f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{name_lower}')]"
        )
    else:
        xpath = f"//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{name_lower}')]"
    return driver.find_element(By.XPATH, xpath)


def scoped_css(scope: str, selectors: str) -> str:
    return ", ".join(f"{scope}{part.strip()}" for part in selectors.split(","))


def first_visible_css(driver: WebDriver, *selector_groups: str) -> WebElement | None:
    for group in selector_groups:
        for el in driver.find_elements(By.CSS_SELECTOR, group):
            if el.is_displayed():
                return el
    return None


def find_optional(driver: WebDriver, by: tuple[str, str], timeout: float = 0) -> WebElement | None:
    try:
        return driver.find_element(*by)
    except Exception:
        return None
