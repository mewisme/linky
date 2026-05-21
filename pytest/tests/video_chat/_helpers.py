from __future__ import annotations

from selenium.webdriver.remote.webelement import WebElement

from linky_e2e.helpers.pace import pause
from linky_e2e.helpers.waits import wait_hidden


def assert_visible(el: WebElement) -> None:
    assert el.is_displayed()


def assert_not_visible_by_test_id(page, test_id: str, timeout: float | None = None) -> None:
    from linky_e2e.helpers.locators import by_test_id

    wait_hidden(page.driver, by_test_id(test_id), timeout)


def element_visible(el: WebElement) -> bool:
    try:
        return el.is_displayed()
    except Exception:
        return False


def sleep(seconds: float) -> None:
    pause(seconds)
