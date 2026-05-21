from __future__ import annotations

import time

from linky_e2e.config import settings

AUTH_STEP = 1.0
STEP_SHORT = 0.25
STEP = 0.5
POLL = 0.3
PAGE_SETTLE = 1.0
NETWORK_SETTLE = 1.5
OTP_WAIT = 5.0
BETWEEN_TESTS = 0.8
OAUTH_WAIT = 2.0


def pause(seconds: float, *, fast_floor: float = 0) -> None:
    if settings.run_fast:
        if fast_floor > 0:
            time.sleep(fast_floor)
        return
    time.sleep(seconds)


def poll_interval() -> float:
    return 0.05 if settings.run_fast else POLL


def delay_seconds(human: float, *, fast_floor: float = 0) -> float:
    return fast_floor if settings.run_fast else human
