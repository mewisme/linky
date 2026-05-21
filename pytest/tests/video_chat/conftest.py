from __future__ import annotations

import pytest
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage


@pytest.fixture
def video_chat_driver(request: pytest.FixtureRequest) -> WebDriver:
    driver = create_cloak_driver(media_permissions=True)
    create_authenticated_driver(driver, TEST_USERS["user1"])
    request.addfinalizer(lambda: quit_driver(driver))
    return driver


@pytest.fixture
def video_chat_page(video_chat_driver: WebDriver) -> VideoChatPage:
    return VideoChatPage(video_chat_driver)
