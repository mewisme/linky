from __future__ import annotations

import time
from urllib.parse import urlparse

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from tenacity import retry, stop_after_delay, wait_fixed

from linky_e2e.config import settings
from linky_e2e.helpers.locators import by_role, find_by_test_id, find_optional


def wait_visible(driver: WebDriver, locator: tuple[str, str], timeout: float | None = None) -> None:
    WebDriverWait(driver, timeout or settings.default_timeout_sec).until(
        EC.visibility_of_element_located(locator)
    )


def wait_present(driver: WebDriver, locator: tuple[str, str], timeout: float | None = None) -> None:
    WebDriverWait(driver, timeout or settings.default_timeout_sec).until(
        EC.presence_of_element_located(locator)
    )


def wait_hidden(driver: WebDriver, locator: tuple[str, str], timeout: float | None = None) -> None:
    WebDriverWait(driver, timeout or settings.default_timeout_sec).until(
        EC.invisibility_of_element_located(locator)
    )


def wait_url_matches(driver: WebDriver, pattern: str, timeout: float = 20) -> None:
    import re

    rx = re.compile(pattern)

    def _match(_: WebDriver) -> bool:
        return bool(rx.search(driver.current_url))

    WebDriverWait(driver, timeout).until(_match)


def wait_for_clerk_ready(driver: WebDriver, timeout: float | None = None) -> None:
    wait_present(driver, ("css selector", '[data-clerk-ready="true"]'), timeout)


def _is_locale_home_pathname(pathname: str) -> bool:
    p = pathname.rstrip("/") or "/"
    return p in ("/", "/vi")


def _is_auth_pathname(pathname: str) -> bool:
    return (
        pathname.startswith("/sign-in")
        or pathname.startswith("/sign-up")
        or pathname.startswith("/vi/sign-in")
        or pathname.startswith("/vi/sign-up")
    )


def is_post_auth_app_url(url: str) -> bool:
    parsed = urlparse(url)
    href = url
    if "verify-email" in href or "factor-two" in href:
        return False
    if _is_locale_home_pathname(parsed.path):
        return True
    if _is_auth_pathname(parsed.path):
        return False
    return True


def _click_proceed_to_redirect_if_shown(driver: WebDriver) -> None:
    import re

    try:
        el = by_role(driver, "link", name=re.compile(r"proceed to redirect url", re.I))
        if el.is_displayed():
            el.click()
            return
    except Exception:
        pass
    try:
        el = driver.find_element(
            "xpath",
            "//a[contains(translate(normalize-space(.), "
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'proceed to redirect url')]",
        )
        if el.is_displayed():
            el.click()
    except Exception:
        pass


@retry(stop=stop_after_delay(20), wait=wait_fixed(0.5), reraise=True)
def wait_for_redirect_to_home(driver: WebDriver, timeout: float = 20) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        _click_proceed_to_redirect_if_shown(driver)
        if is_post_auth_app_url(driver.current_url):
            return
        time.sleep(0.3)
    raise TimeoutError(f"Timed out waiting for post-auth URL, last: {driver.current_url}")


def poll_until(predicate, timeout: float = 8, interval: float = 0.25) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(interval)
    return False


def assert_not_visible_error(driver: WebDriver) -> None:
    el = find_optional(driver, by_test_id("form-feedback-error"))
    if el is not None and el.is_displayed():
        raise AssertionError("form-feedback-error is visible")
