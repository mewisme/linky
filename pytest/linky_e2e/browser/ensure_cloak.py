from __future__ import annotations

import sys


def main() -> None:
    from cloakbrowser.download import ensure_binary

    from linky_e2e.browser.chromedriver import install_chromedriver_for_binary

    print("Downloading / verifying CloakBrowser Chromium binary...")
    binary_path = ensure_binary()
    print(f"CloakBrowser binary ready: {binary_path}")

    print("Installing / verifying ChromeDriver (matched to Cloak Chromium)...")
    driver_path = install_chromedriver_for_binary(binary_path)
    print(f"ChromeDriver ready: {driver_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ensure-cloak failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
