from __future__ import annotations

import pytest
from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.fixtures.call import (
    SingleUserSetup,
    TwoUserCallSetup,
    establish_call,
    setup_default_single_user_call,
    setup_default_two_user_call,
    teardown_single_user_call,
    teardown_two_user_call,
)
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage


@pytest.fixture
def single_user_call(request: pytest.FixtureRequest) -> SingleUserSetup:
    setup = setup_default_single_user_call(media_permissions=True)
    request.addfinalizer(lambda: teardown_single_user_call(setup))
    return setup


@pytest.fixture
def single_user_call_no_media(request: pytest.FixtureRequest) -> SingleUserSetup:
    setup = setup_default_single_user_call(media_permissions=False)
    request.addfinalizer(lambda: teardown_single_user_call(setup))
    return setup


@pytest.fixture
def two_user_call(request: pytest.FixtureRequest) -> TwoUserCallSetup:
    setup = setup_default_two_user_call(media_permissions=True)
    request.addfinalizer(lambda: teardown_two_user_call(setup))
    return setup


@pytest.fixture
def video_chat_driver(single_user_call: SingleUserSetup) -> WebDriver:
    assert single_user_call.driver is not None
    return single_user_call.driver


@pytest.fixture
def video_chat_page(single_user_call: SingleUserSetup) -> VideoChatPage:
    return single_user_call.page


@pytest.fixture
def user1_driver(single_user_call: SingleUserSetup) -> WebDriver:
    assert single_user_call.driver is not None
    return single_user_call.driver


@pytest.fixture
def user1_page(single_user_call: SingleUserSetup) -> VideoChatPage:
    return single_user_call.page


@pytest.fixture
def user2_driver(two_user_call: TwoUserCallSetup) -> WebDriver:
    assert two_user_call.user2_driver is not None
    return two_user_call.user2_driver


@pytest.fixture
def user2_page(two_user_call: TwoUserCallSetup) -> VideoChatPage:
    return two_user_call.user2_page


@pytest.fixture
def active_call(two_user_call: TwoUserCallSetup) -> TwoUserCallSetup:
    establish_call(two_user_call.user1_page, two_user_call.user2_page)
    return two_user_call
