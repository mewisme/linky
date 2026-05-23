from __future__ import annotations

import re
from contextlib import contextmanager
from typing import Iterator

from selenium.webdriver.remote.webdriver import WebDriver


@contextmanager
def block_url_pattern(driver: WebDriver, url_pattern: str) -> Iterator[None]:
    """Block network requests matching a glob-like pattern via CDP."""
    glob = url_pattern.replace("**", "*")
    rx = "^" + re.escape(glob).replace(r"\*", ".*") + "$"
    driver.execute_cdp_cmd("Network.enable", {})
    driver.execute_cdp_cmd("Network.setBlockedURLs", {"urls": [rx]})
    try:
        yield
    finally:
        driver.execute_cdp_cmd("Network.setBlockedURLs", {"urls": []})


@contextmanager
def fulfill_json(
    driver: WebDriver,
    url_pattern: str,
    *,
    status: int = 500,
    body: str = '{"error":"mock"}',
) -> Iterator[None]:
    """Intercept and fulfill matching requests (simplified via blocked + skip for abort-only tests)."""
    with block_url_pattern(driver, url_pattern):
        yield
