from __future__ import annotations

import re
import subprocess


def chrome_version_from_binary(binary_path: str) -> str:
    proc = subprocess.run(
        [binary_path, "--version"],
        capture_output=True,
        text=True,
        check=True,
    )
    match = re.search(r"([\d.]+)", proc.stdout)
    if not match:
        raise RuntimeError(f"Could not parse Chromium version from: {proc.stdout!r}")
    return match.group(1)


def install_chromedriver_for_binary(binary_path: str) -> str:
    import chromedriver_autoinstaller.utils as cdu
    import chromedriver_autoinstaller

    version = chrome_version_from_binary(binary_path)
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
