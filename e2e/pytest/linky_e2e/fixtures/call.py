from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TEST_USERS, TestUser
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage


@dataclass
class SingleUserSetup:
    driver: WebDriver | None
    page: VideoChatPage


@dataclass
class TwoUserCallSetup:
    user1_driver: WebDriver | None
    user2_driver: WebDriver | None
    user1_page: VideoChatPage
    user2_page: VideoChatPage


def setup_single_user_call(
    user: TestUser,
    *,
    media_permissions: bool = True,
) -> SingleUserSetup:
    driver = create_cloak_driver(media_permissions=media_permissions)
    create_authenticated_driver(driver, user)
    return SingleUserSetup(driver=driver, page=VideoChatPage(driver))


def setup_default_single_user_call(*, media_permissions: bool = True) -> SingleUserSetup:
    return setup_single_user_call(
        TEST_USERS["user1"],
        media_permissions=media_permissions,
    )


def teardown_single_user_call(setup: SingleUserSetup) -> None:
    quit_driver(setup.driver)


def setup_two_user_call(
    user1: TestUser,
    user2: TestUser,
    *,
    media_permissions: bool = True,
) -> TwoUserCallSetup:
    user1_driver = create_cloak_driver(media_permissions=media_permissions)
    user2_driver = create_cloak_driver(media_permissions=media_permissions)

    with ThreadPoolExecutor(max_workers=2) as pool:
        auth1 = pool.submit(create_authenticated_driver, user1_driver, user1)
        auth2 = pool.submit(create_authenticated_driver, user2_driver, user2)
        auth1.result()
        auth2.result()

    return TwoUserCallSetup(
        user1_driver=user1_driver,
        user2_driver=user2_driver,
        user1_page=VideoChatPage(user1_driver),
        user2_page=VideoChatPage(user2_driver),
    )


def setup_default_two_user_call(*, media_permissions: bool = True) -> TwoUserCallSetup:
    return setup_two_user_call(
        TEST_USERS["user1"],
        TEST_USERS["user2"],
        media_permissions=media_permissions,
    )


def quit_call_driver(driver: WebDriver | None) -> None:
    quit_driver(driver)


def teardown_two_user_call(setup: TwoUserCallSetup) -> None:
    quit_driver(setup.user1_driver)
    quit_driver(setup.user2_driver)


def establish_call(page1: VideoChatPage, page2: VideoChatPage) -> None:
    page1.goto()
    page1.wait_for_idle()
    page2.goto()
    page2.wait_for_idle()
    page1.start_button().click()
    page1.wait_for_searching()
    page2.start_button().click()
    page1.wait_for_in_call()
    page2.wait_for_in_call()


def end_call(page1: VideoChatPage, page2: VideoChatPage) -> None:
    page1.end_call_button().click()
    page1.wait_for_idle()
    page2.wait_for_idle()
