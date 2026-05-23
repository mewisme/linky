from __future__ import annotations

import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)


def install_chromedriver() -> str:
    import chromedriver_autoinstaller
    import chromedriver_autoinstaller.utils as cdu
    from cloakbrowser.config import get_effective_version

    version = get_effective_version()
    logger.info("Installing ChromeDriver for CloakBrowser Chromium %s...", version)
    original = cdu.get_chrome_version
    try:
        cdu.get_chrome_version = lambda: version
        driver_path = chromedriver_autoinstaller.install()
    finally:
        cdu.get_chrome_version = original

    if not driver_path:
        raise RuntimeError(
            f"Could not install ChromeDriver for Chromium {version}. "
            "Try again after `uv run ensure-cloak`."
        )
    return driver_path


def clear_chromedriver_cache() -> list[str]:
    import chromedriver_autoinstaller

    pkg_dir = Path(chromedriver_autoinstaller.__file__).parent
    removed: list[str] = []
    for entry in pkg_dir.iterdir():
        if entry.is_dir() and entry.name.isdigit():
            shutil.rmtree(entry)
            removed.append(str(entry))
    return removed
