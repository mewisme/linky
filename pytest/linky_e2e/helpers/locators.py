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

    if isinstance(name, Pattern):
        pattern = name.pattern
        flags = re.IGNORECASE if name.flags & re.IGNORECASE else 0
        xpath = (
            f"//{tag}[contains(translate(normalize-space(.), "
            f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
            f"'{pattern.lower()}')]"
        )
        if tag == "input":
            xpath = (
                "//input[(@type='text' or @type='email' or @type='password' or not(@type)) "
                f"and contains(translate(@aria-label, "
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pattern.lower()}')]"
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
    elif tag == "input":
        xpath = (
            f"//input[contains(translate(@aria-label, "
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


def find_optional(driver: WebDriver, by: tuple[str, str], timeout: float = 0) -> WebElement | None:
    try:
        return driver.find_element(*by)
    except Exception:
        return None
