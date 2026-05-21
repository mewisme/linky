from __future__ import annotations

import logging
import sys


def _configure_progress_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        force=True,
        stream=sys.stdout,
    )
    for name in ("cloakbrowser", "chromedriver_autoinstaller", "linky_e2e.browser.chromedriver"):
        logging.getLogger(name).setLevel(logging.INFO)


def main() -> None:
    _configure_progress_logging()
    from cloakbrowser.download import ensure_binary

    from linky_e2e.browser.chromedriver import install_chromedriver

    print("Downloading / verifying CloakBrowser Chromium binary...")
    binary_path = ensure_binary()
    print(f"CloakBrowser binary ready: {binary_path}")

    print("Installing / verifying ChromeDriver (matched to Cloak Chromium)...")
    driver_path = install_chromedriver()
    print(f"ChromeDriver ready: {driver_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ensure-cloak failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
