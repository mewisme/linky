from __future__ import annotations

import chromedriver_autoinstaller
from cloakbrowser.config import get_default_stealth_args
from cloakbrowser.download import ensure_binary
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

from linky_e2e.config import settings

_MEDIA_PREFS = {
    "profile.default_content_setting_values.media_stream_camera": 1,
    "profile.default_content_setting_values.media_stream_mic": 1,
}


def create_cloak_driver(
    *,
    headless: bool | None = None,
    media_permissions: bool = False,
) -> webdriver.Chrome:
    binary_path = ensure_binary()
    chromedriver_autoinstaller.install()

    options = Options()
    options.binary_location = binary_path
    for arg in get_default_stealth_args():
        options.add_argument(arg)

    use_headless = (not settings.headed) if headless is None else headless
    if use_headless:
        options.add_argument("--headless=new")

    if settings.ignore_https_errors:
        options.add_argument("--ignore-certificate-errors")
        options.add_argument("--allow-insecure-localhost")

    options.add_argument(
        f"--window-size={settings.viewport_width},{settings.viewport_height}"
    )
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")

    prefs: dict[str, int] = {}
    if media_permissions:
        prefs.update(_MEDIA_PREFS)
    if prefs:
        options.add_experimental_option("prefs", prefs)

    service = Service()
    driver = webdriver.Chrome(service=service, options=options)
    driver.set_window_size(settings.viewport_width, settings.viewport_height)
    driver.implicitly_wait(0)
    return driver


def quit_driver(driver: webdriver.Chrome) -> None:
    try:
        driver.quit()
    except Exception:
        pass
