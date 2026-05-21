from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[2]
_PYTEST_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_PYTEST_ROOT / ".env")


def _truthy(name: str) -> bool:
    v = os.environ.get(name, "")
    return v in ("1", "true", "True", "yes")


class Settings:
    base_url: str
    headed: bool
    run_fast: bool
    ignore_https_errors: bool
    default_timeout_sec: float
    viewport_width: int
    viewport_height: int
    test_data_dir: Path
    auth_dir: Path

    def __init__(self) -> None:
        base = os.environ.get("BASE_TEST_URL", "").rstrip("/")
        if not base:
            raise RuntimeError("BASE_TEST_URL is not set (repo root .env or pytest/.env)")
        self.base_url = base
        self.headed = _truthy("HEADED") or _truthy("PWHEADED") or _truthy("PWDEBUG")
        self.run_fast = _truthy("RUN_FAST")
        self.ignore_https_errors = _truthy("IGNORE_HTTPS_ERRORS") or _truthy("E2E_IGNORE_HTTPS_ERRORS")
        self.default_timeout_sec = float(os.environ.get("E2E_TIMEOUT_SEC", "30"))
        self.viewport_width = int(os.environ.get("E2E_VIEWPORT_WIDTH", "1280"))
        self.viewport_height = int(os.environ.get("E2E_VIEWPORT_HEIGHT", "720"))
        self.test_data_dir = _PYTEST_ROOT / "linky_e2e" / "test_data"
        self.auth_dir = _PYTEST_ROOT / ".auth"


settings = Settings()
