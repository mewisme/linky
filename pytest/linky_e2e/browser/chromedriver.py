from __future__ import annotations

import logging
import re
import shutil
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

_VERSION_RE = re.compile(r"(\d+\.\d+\.\d+\.\d+)")


def _version_from_cloak_cache_dir(binary_path: str) -> str | None:
    match = re.match(r"chromium-([\d.]+)$", Path(binary_path).parent.name, re.I)
    return match.group(1) if match else None


def chrome_version_from_binary(binary_path: str) -> str:
    proc = subprocess.run(
        [binary_path, "--version"],
        capture_output=True,
        text=True,
        check=False,
    )
    combined = f"{proc.stdout or ''}{proc.stderr or ''}".strip()
    match = _VERSION_RE.search(combined)
    if match:
        return match.group(1)

    from_cache = _version_from_cloak_cache_dir(binary_path)
    if from_cache:
        logger.info(
            "Using Chromium version from cache directory name: %s", from_cache
        )
        return from_cache

    raise RuntimeError(
        "Could not parse Chromium version. "
        f"exit={proc.returncode}, stdout={proc.stdout!r}, stderr={proc.stderr!r}"
    )


def install_chromedriver_for_binary(binary_path: str) -> str:
    import chromedriver_autoinstaller
    import chromedriver_autoinstaller.utils as cdu

    version = chrome_version_from_binary(binary_path)
    logger.info("Installing ChromeDriver for Chromium %s...", version)
    original = cdu.get_chrome_version
    try:
        cdu.get_chrome_version = lambda: version
        driver_path = chromedriver_autoinstaller.install()
    finally:
        cdu.get_chrome_version = original

    if not driver_path:
        raise RuntimeError(
            f"Could not install ChromeDriver for Chromium {version} (CloakBrowser binary)."
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
