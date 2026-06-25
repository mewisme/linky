from __future__ import annotations

import os
from dataclasses import dataclass

from linky_e2e.storage.state import normalize_storage_state_path
from linky_e2e.test_data.clerk_test_auth import (
    CLERK_TEST_OTP,
    DEFAULT_TEST_PASSWORD,
    clerk_test_email,
)

REQUIRED_TEST_USER_KEYS = ("user1", "user2")
OPTIONAL_TEST_USER_KEYS = ("user3", "user4", "user5", "user6", "user7")
TEST_USER_KEYS = REQUIRED_TEST_USER_KEYS + OPTIONAL_TEST_USER_KEYS


@dataclass(frozen=True)
class TestUser:
    id: str
    email: str
    password: str
    otp: str
    storage_state_path: str
    first_name: str | None = None
    last_name: str | None = None


def _env_str(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip()


def _user_env_prefix(user_id: str) -> str:
    suffix = user_id.removeprefix("user")
    return f"E2E_USER{suffix}_"


def _load_test_user_from_env(user_id: str) -> TestUser | None:
    prefix = _user_env_prefix(user_id)
    email = _env_str(f"{prefix}EMAIL") or clerk_test_email(user_id)
    password = (
        _env_str(f"{prefix}PASSWORD")
        or _env_str("E2E_TEST_PASSWORD")
        or DEFAULT_TEST_PASSWORD
    )
    otp = _env_str(f"{prefix}OTP") or _env_str("E2E_TEST_OTP") or CLERK_TEST_OTP
    storage = normalize_storage_state_path(
        _env_str(f"{prefix}STORAGE", f".auth/{user_id}.json")
    )
    first_name = _env_str(f"{prefix}FIRST_NAME") or None
    last_name = _env_str(f"{prefix}LAST_NAME") or None

    if user_id in OPTIONAL_TEST_USER_KEYS and not _env_str(f"{prefix}EMAIL"):
        return None

    return TestUser(
        id=user_id,
        email=email,
        password=password,
        otp=otp,
        storage_state_path=storage,
        first_name=first_name,
        last_name=last_name,
    )


def build_test_users_registry() -> dict[str, TestUser]:
    out: dict[str, TestUser] = {}
    for key in REQUIRED_TEST_USER_KEYS:
        user = _load_test_user_from_env(key)
        if user is None:
            prefix = _user_env_prefix(key)
            raise RuntimeError(
                f"Missing required test user {key!r}. Set {prefix}EMAIL (and optionally "
                f"{prefix}PASSWORD, {prefix}OTP, {prefix}STORAGE)."
            )
        out[key] = user
    for key in OPTIONAL_TEST_USER_KEYS:
        user = _load_test_user_from_env(key)
        if user is not None:
            out[key] = user
    return out


_TEST_USERS_CACHE: dict[str, TestUser] | None = None


def get_test_users() -> dict[str, TestUser]:
    global _TEST_USERS_CACHE
    if _TEST_USERS_CACHE is None:
        _TEST_USERS_CACHE = build_test_users_registry()
    return _TEST_USERS_CACHE


class _TestUsersProxy:
    def __getitem__(self, key: str) -> TestUser:
        return get_test_users()[key]

    def get(self, key: str, default: TestUser | None = None) -> TestUser | None:
        return get_test_users().get(key, default)

    def __contains__(self, key: object) -> bool:
        return key in get_test_users()

    def keys(self):
        return get_test_users().keys()

    def values(self):
        return get_test_users().values()

    def items(self):
        return get_test_users().items()


TEST_USERS: _TestUsersProxy = _TestUsersProxy()
