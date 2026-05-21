from __future__ import annotations

import sys

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.fixtures.auth_flow import refresh_storage_state_for_user
from linky_e2e.fixtures.users import get_test_users

_SETUP_USERS = ("user1", "user2")


def main() -> None:
    users = get_test_users()
    targets = [users[k] for k in _SETUP_USERS if k in users]
    if not targets:
        print("No test users found in Excel data.")
        raise SystemExit(1)

    driver = create_cloak_driver()
    try:
        for user in targets:
            print(f"Refreshing storage for {user.id}...")
            refresh_storage_state_for_user(driver, user)
            print(f"  saved {user.storage_state_path}")
    finally:
        quit_driver(driver)
    print("Done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"refresh-auth failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
