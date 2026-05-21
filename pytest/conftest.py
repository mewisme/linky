from __future__ import annotations

import pytest
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import create_authenticated_driver, refresh_storage_state_for_user
from linky_e2e.fixtures.users import TEST_USERS, TestUser, get_test_users
from linky_e2e.storage.state import is_valid_storage_state, resolve_storage_path


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


@pytest.fixture(scope="session")
def base_url() -> str:
    return settings.base_url


@pytest.fixture(scope="session", autouse=True)
def _session_storage_states() -> None:
    setup_user_ids = ("user1", "user2")
    users = get_test_users()
    targets = [users[k] for k in setup_user_ids if k in users]
    if not targets:
        return

    if all(is_valid_storage_state(resolve_storage_path(u.storage_state_path)) for u in targets):
        return

    driver = create_cloak_driver()
    try:
        for user in targets:
            path = resolve_storage_path(user.storage_state_path)
            if is_valid_storage_state(path):
                continue
            try:
                refresh_storage_state_for_user(driver, user)
            except Exception as exc:
                print(
                    f"[session-setup] WARNING: could not refresh {user.id}: {exc}; "
                    f"using existing storage if present"
                )
    finally:
        quit_driver(driver)


@pytest.fixture
def driver() -> WebDriver:
    d = create_cloak_driver()
    yield d
    quit_driver(d)


@pytest.fixture
def media_driver() -> WebDriver:
    d = create_cloak_driver(media_permissions=True)
    yield d
    quit_driver(d)


@pytest.fixture
def authenticated_driver(driver: WebDriver) -> WebDriver:
    create_authenticated_driver(driver, get_test_users()["user1"])
    return driver


@pytest.fixture(params=list(get_test_users().keys()))
def user_key(request: pytest.FixtureRequest) -> str:
    return request.param


@pytest.fixture
def test_user(user_key: str) -> TestUser:
    return get_test_users()[user_key]
