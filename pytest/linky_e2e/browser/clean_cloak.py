from __future__ import annotations

import logging
import sys

from cloakbrowser.config import get_cache_dir
from cloakbrowser.download import clear_cache

from linky_e2e.browser.chromedriver import clear_chromedriver_cache


def _configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        force=True,
        stream=sys.stdout,
    )


def main() -> None:
    _configure_logging()
    cache_dir = get_cache_dir()

    print("Removing CloakBrowser cache...")
    if cache_dir.exists():
        clear_cache()
    else:
        print(f"  (no cache at {cache_dir})")

    print("Removing ChromeDriver cache...")
    removed = clear_chromedriver_cache()
    if removed:
        for path in removed:
            print(f"  removed {path}")
    else:
        print("  (no cached ChromeDriver versions)")

    print("Clean complete. Run `uv run ensure-cloak` to reinstall.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"clean-cloak failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
