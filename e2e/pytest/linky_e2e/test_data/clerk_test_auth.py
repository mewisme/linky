from __future__ import annotations

import os
import re
import time

CLERK_TEST_OTP = "424242"
CLERK_TEST_DOMAIN = "linky.now"
DEFAULT_TEST_PASSWORD = "ValidPass123!"

SIGNUP_TEST_DOMAIN = CLERK_TEST_DOMAIN


def _sanitize_local_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "", name.strip())
    return cleaned or "user"


def clerk_test_domain() -> str:
    return os.environ.get("CLERK_TEST_DOMAIN", os.environ.get("SIGNUP_TEST_DOMAIN", CLERK_TEST_DOMAIN)).strip() or CLERK_TEST_DOMAIN


def clerk_test_email(name: str | None = None) -> str:
    """Clerk test-mode: {name}+clerk_test@linky.now (OTP 424242)."""
    local = _sanitize_local_name(name) if name else f"test{int(time.time() * 1000)}"
    return f"{local}+clerk_test@{clerk_test_domain()}"


def is_clerk_test_email(email: str) -> bool:
    return "+clerk_test@" in (email or "").lower()


def resolve_test_otp(otp: str | None = None) -> str:
    return (otp or "").strip() or CLERK_TEST_OTP


fresh_clerk_test_email = clerk_test_email
