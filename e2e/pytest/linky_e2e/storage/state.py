from __future__ import annotations

import json
from pathlib import Path

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.config import settings
from linky_e2e.helpers.automation_context import ensure_automation_context

_PYTEST_ROOT = Path(__file__).resolve().parents[2]


def normalize_storage_state_path(path: str) -> str:
    p = (path or "").strip()
    if p.startswith("playwright/.auth/"):
        return ".auth/" + p[len("playwright/.auth/") :]
    if p.startswith("./playwright/.auth/"):
        return ".auth/" + p[len("./playwright/.auth/") :]
    return p


def resolve_storage_path(path: str) -> Path:
    normalized = normalize_storage_state_path(path)
    p = Path(normalized)
    if p.is_absolute():
        return p
    if normalized.startswith(".auth/"):
        return _PYTEST_ROOT / normalized
    return _PYTEST_ROOT / normalized.lstrip("./")


def is_valid_storage_state(file_path: Path) -> bool:
    try:
        raw = file_path.read_text(encoding="utf-8")
        state = json.loads(raw)
        cookies = isinstance(state.get("cookies"), list) and len(state["cookies"]) > 0
        origins = isinstance(state.get("origins"), list) and len(state["origins"]) > 0
        return cookies or origins
    except Exception:
        return False


def load_storage_state(driver: WebDriver, storage_path: str | Path) -> None:
    path = Path(storage_path) if isinstance(storage_path, Path) else resolve_storage_path(storage_path)
    if not path.exists():
        raise FileNotFoundError(f"Storage state not found: {path}")

    state = json.loads(path.read_text(encoding="utf-8"))
    base = settings.base_url
    driver.get(base)

    for cookie in state.get("cookies", []):
        c = dict(cookie)
        if "sameSite" in c and c["sameSite"] not in ("Strict", "Lax", "None"):
            c.pop("sameSite", None)
        if "expiry" in c:
            c["expiry"] = int(c["expiry"])
        try:
            driver.add_cookie(c)
        except Exception:
            pass

    for origin_entry in state.get("origins", []):
        origin = origin_entry.get("origin", "")
        items = origin_entry.get("localStorage", [])
        if not origin or not items:
            continue
        driver.get(origin)
        for item in items:
            name = item.get("name", "")
            value = item.get("value", "")
            if name:
                driver.execute_script(
                    "window.localStorage.setItem(arguments[0], arguments[1]);",
                    name,
                    value,
                )

    driver.get(base)
    ensure_automation_context(driver)


def save_storage_state(driver: WebDriver, storage_path: str | Path) -> None:
    path = Path(storage_path) if isinstance(storage_path, Path) else resolve_storage_path(storage_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    cookies = driver.get_cookies()
    origin = settings.base_url.rstrip("/")
    ls_items = driver.execute_script(
        """
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          items.push({ name: k, value: localStorage.getItem(k) });
        }
        return items;
        """
    )
    payload = {
        "cookies": cookies,
        "origins": [{"origin": origin, "localStorage": ls_items or []}],
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
