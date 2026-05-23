from __future__ import annotations

import time
from typing import Literal

from linky_e2e.test_data.clerk_test_auth import (
    CLERK_TEST_DOMAIN,
    CLERK_TEST_OTP,
    clerk_test_domain,
    clerk_test_email,
    fresh_clerk_test_email,
)

AutoRemovePosition = Literal["prefix", "suffix", "include"]

SIGNUP_TEST_DOMAIN = CLERK_TEST_DOMAIN


class SignupEmailOptions:
    def __init__(
        self,
        *,
        enable_generate: bool,
        auto_remove_content: str | None,
        auto_remove_position: AutoRemovePosition | None,
    ) -> None:
        self.enable_generate = enable_generate
        self.auto_remove_content = auto_remove_content
        self.auto_remove_position = auto_remove_position


def _trimmed_env(name: str) -> str | None:
    import os

    v = os.environ.get(name)
    if v is None:
        return None
    t = v.strip()
    return None if t == "" else t


def get_signup_email_options_for_generate(enable_generate: bool) -> SignupEmailOptions:
    pos_raw = _trimmed_env("SIGNUP_EMAIL_AUTO_REMOVE_POSITION") or "include"
    pos: AutoRemovePosition = pos_raw if pos_raw in ("prefix", "suffix", "include") else "include"
    return SignupEmailOptions(
        enable_generate=enable_generate,
        auto_remove_content="amtest",
        auto_remove_position=pos,
    )


def _generate_signup_email_with_options(base_email: str, options: SignupEmailOptions) -> str:
    if not options.enable_generate:
        return base_email or ""
    if not base_email or "@" not in base_email:
        return base_email or ""
    if "+clerk_test" not in base_email.lower():
        return base_email
    local = base_email.split("+")[0]
    return clerk_test_email(local)


def generate_signup_email(
    base_email: str,
    options_or_enable: bool | SignupEmailOptions,
) -> str:
    if isinstance(options_or_enable, bool) and options_or_enable:
        return clerk_test_email()
    options = (
        get_signup_email_options_for_generate(options_or_enable)
        if isinstance(options_or_enable, bool)
        else options_or_enable
    )
    return _generate_signup_email_with_options(base_email, options)


def should_disable_signup_email_generate(expected_message: str) -> bool:
    if not expected_message:
        return False
    return (
        "email address already in use" in expected_message
        or "email address is taken" in expected_message
    )
