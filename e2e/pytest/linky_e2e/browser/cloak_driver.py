from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from typing import TYPE_CHECKING
from weakref import WeakSet

from cloakbrowser.config import get_default_stealth_args
from cloakbrowser.download import ensure_binary
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

from linky_e2e.browser.chromedriver import install_chromedriver
from linky_e2e.config import settings

if TYPE_CHECKING:
    from selenium.webdriver.chrome.webdriver import WebDriver

_MEDIA_PREFS = {
    "profile.default_content_setting_values.media_stream_camera": 1,
    "profile.default_content_setting_values.media_stream_mic": 1,
}

_active_drivers: WeakSet[WebDriver] = WeakSet()
_chromedriver_ready = False


def _ensure_chromedriver() -> None:
    global _chromedriver_ready
    if _chromedriver_ready:
        return
    install_chromedriver()
    _chromedriver_ready = True


def _pids_for_driver(driver: WebDriver) -> list[int]:
    pids: list[int] = []
    browser_pid = getattr(driver, "browser_pid", None)
    if browser_pid:
        pids.append(int(browser_pid))
    service = getattr(driver, "service", None)
    process = getattr(service, "process", None) if service else None
    if process is not None and process.pid:
        pids.append(int(process.pid))
    return pids


def _kill_pid(pid: int) -> None:
    if pid <= 0:
        return
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            check=False,
            capture_output=True,
        )
        return
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        return
    time.sleep(0.15)
    try:
        os.kill(pid, signal.SIGKILL)
    except OSError:
        pass


def _kill_process_tree(pids: list[int]) -> None:
    for pid in dict.fromkeys(pids):
        _kill_pid(pid)


def create_cloak_driver(
    *,
    headless: bool | None = None,
    media_permissions: bool = False,
) -> WebDriver:
    binary_path = ensure_binary()
    _ensure_chromedriver()

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
        options.add_argument("--use-fake-device-for-media-stream")
        options.add_argument("--use-fake-ui-for-media-stream")
        options.add_argument("--autoplay-policy=no-user-gesture-required")
    if prefs:
        options.add_experimental_option("prefs", prefs)

    service = Service()
    driver = webdriver.Chrome(service=service, options=options)
    driver.set_window_size(settings.viewport_width, settings.viewport_height)
    driver.implicitly_wait(0)
    _active_drivers.add(driver)
    return driver


def quit_driver(driver: WebDriver | None) -> None:
    if driver is None:
        return
    _active_drivers.discard(driver)
    pids = _pids_for_driver(driver)
    try:
        driver.quit()
    except Exception:
        pass
    service = getattr(driver, "service", None)
    if service is not None:
        try:
            service.stop()
        except Exception:
            pass
    _kill_process_tree(pids)


def quit_all_drivers() -> None:
    for driver in list(_active_drivers):
        quit_driver(driver)
