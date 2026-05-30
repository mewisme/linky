from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from selenium.webdriver.remote.webdriver import WebDriver

LINKY_E2E_STORAGE_KEY = "linky:e2e"

INSTALL_ON_NEW_DOCUMENT_SCRIPT = """
window.__LINKY_E2E__ = true;
try { localStorage.setItem('linky:e2e', '1'); } catch (e) {}
"""

ENSURE_ON_PAGE_SCRIPT = """
window.__LINKY_E2E__ = true;
try { localStorage.setItem('linky:e2e', '1'); } catch (e) {}
return window.__LINKY_E2E__ === true;
"""


def install_automation_init_script(driver: WebDriver) -> None:
    try:
        driver.execute_cdp_cmd(
            "Page.addScriptToEvaluateOnNewDocument",
            {"source": INSTALL_ON_NEW_DOCUMENT_SCRIPT},
        )
    except Exception:
        pass


def ensure_automation_context(driver: WebDriver) -> bool:
    try:
        return bool(driver.execute_script(ENSURE_ON_PAGE_SCRIPT))
    except Exception:
        return False
