from __future__ import annotations

import pytest
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_all_drivers, quit_driver
from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver, refresh_storage_state_for_user
from linky_e2e.fixtures.users import TestUser, get_test_users
from linky_e2e.storage.state import is_valid_storage_state, resolve_storage_path

_SESSION_SETUP_USERS = ("user1", "user2")


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line("markers", "auth: authentication suite")
    config.addinivalue_line("markers", "user_profile: user profile suite")
    config.addinivalue_line("markers", "video_chat: video chat (serial)")


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    for item in items:
        path = str(item.fspath)
        if "/tests/auth/" in path:
            item.add_marker(pytest.mark.auth)
        elif "/tests/user_profile/" in path:
            item.add_marker(pytest.mark.user_profile)
        elif "/tests/video_chat/" in path:
            item.add_marker(pytest.mark.video_chat)


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    quit_all_drivers()


def _session_setup_targets() -> list[TestUser]:
    users = get_test_users()
    return [users[k] for k in _SESSION_SETUP_USERS if k in users]


def _refresh_missing_storage_states() -> None:
    targets = _session_setup_targets()
    if not targets:
        return
    missing = [
        u
        for u in targets
        if not is_valid_storage_state(resolve_storage_path(u.storage_state_path))
    ]
    if not missing:
        return

    driver = create_cloak_driver()
    try:
        for user in missing:
            try:
                refresh_storage_state_for_user(driver, user)
            except Exception as exc:
                print(
                    f"[session-setup] WARNING: could not refresh {user.id}: {exc}; "
                    f"using existing storage if present"
                )
    finally:
        quit_driver(driver)


@pytest.fixture(scope="session", autouse=True)
def _session_storage_states() -> None:
    _refresh_missing_storage_states()


@pytest.fixture(scope="session")
def base_url() -> str:
    return settings.base_url


def _driver_fixture(
    request: pytest.FixtureRequest,
    *,
    media_permissions: bool = False,
) -> WebDriver:
    driver = create_cloak_driver(media_permissions=media_permissions)
    request.addfinalizer(lambda: quit_driver(driver))
    return driver


@pytest.fixture
def driver(request: pytest.FixtureRequest) -> WebDriver:
    return _driver_fixture(request)


@pytest.fixture
def media_driver(request: pytest.FixtureRequest) -> WebDriver:
    return _driver_fixture(request, media_permissions=True)


@pytest.fixture
def authenticated_driver(driver: WebDriver) -> WebDriver:
    create_authenticated_driver(driver, get_test_users()["user1"])
    return driver

