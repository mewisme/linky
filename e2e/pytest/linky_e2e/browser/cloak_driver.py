from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time

from pathlib import Path
from typing import TYPE_CHECKING
from weakref import WeakSet

from cloakbrowser.browser import build_args
from cloakbrowser.download import ensure_binary
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

from linky_e2e.browser.chromedriver import install_chromedriver
from linky_e2e.config import settings
from linky_e2e.helpers.automation_context import install_automation_init_script
from linky_e2e.helpers.media_stream import grant_media_permissions

if TYPE_CHECKING:
    from selenium.webdriver.chrome.webdriver import WebDriver

_MEDIA_PREFS = {
    "profile.default_content_setting_values.media_stream_camera": 1,
    "profile.default_content_setting_values.media_stream_mic": 1,
}

_FAKE_MEDIA_ARGS = (
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--use-fake-capture-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
)

_active_drivers: WeakSet[WebDriver] = WeakSet()
_chromedriver_ready = False
_driver_creation_lock = threading.Lock()

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

def _build_chrome_args(*, headless: bool, media_permissions: bool) -> list[str]:
    extra_args = [
        f"--window-size={settings.viewport_width},{settings.viewport_height}",
        "--disable-dev-shm-usage",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling",
    ]

    if headless:
        extra_args.append("--headless=new")

    if settings.ignore_https_errors:
        extra_args.extend(
            [
                "--ignore-certificate-errors",
                "--allow-insecure-localhost",
            ]
        )

    if media_permissions:
        extra_args.extend(_FAKE_MEDIA_ARGS)

    return build_args(stealth_args=True, extra_args=extra_args, headless=headless)





def create_cloak_driver(

    *,

    headless: bool | None = None,

    media_permissions: bool = False,

) -> WebDriver:

    binary_path = ensure_binary()

    _ensure_chromedriver()



    use_headless = (not settings.headed) if headless is None else headless

    user_data_dir = Path(tempfile.mkdtemp(prefix="linky-e2e-chrome-"))



    options = Options()

    options.binary_location = binary_path

    options.add_argument(f"--user-data-dir={user_data_dir}")

    for arg in _build_chrome_args(headless=use_headless, media_permissions=media_permissions):

        options.add_argument(arg)



    options.add_experimental_option("excludeSwitches", ["enable-automation"])

    options.add_experimental_option("useAutomationExtension", False)



    if media_permissions:

        options.add_experimental_option("prefs", dict(_MEDIA_PREFS))



    with _driver_creation_lock:

        service = Service()

        driver = webdriver.Chrome(service=service, options=options)



    driver._linky_user_data_dir = user_data_dir  # type: ignore[attr-defined]

    driver._linky_media_permissions = media_permissions  # type: ignore[attr-defined]

    install_automation_init_script(driver)

    driver.set_window_size(settings.viewport_width, settings.viewport_height)

    driver.implicitly_wait(0)



    if media_permissions:

        grant_media_permissions(driver)



    _active_drivers.add(driver)

    return driver





def quit_driver(driver: WebDriver | None) -> None:

    if driver is None:

        return

    _active_drivers.discard(driver)

    user_data_dir = getattr(driver, "_linky_user_data_dir", None)

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

    if user_data_dir:

        shutil.rmtree(user_data_dir, ignore_errors=True)





def quit_all_drivers() -> None:

    for driver in list(_active_drivers):

        quit_driver(driver)


