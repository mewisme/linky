from __future__ import annotations

from dataclasses import dataclass

from selenium.webdriver.remote.webdriver import WebDriver

from linky_e2e.browser.cloak_driver import create_cloak_driver, quit_driver
from linky_e2e.fixtures.auth_flow import create_authenticated_driver
from linky_e2e.fixtures.users import TestUser
from linky_e2e.page_objects.video_chat.video_chat_page import VideoChatPage


@dataclass
class TwoUserCallSetup:
    user1_driver: WebDriver | None
    user2_driver: WebDriver
    user1_page: VideoChatPage
    user2_page: VideoChatPage


def setup_two_user_call(user1: TestUser, user2: TestUser) -> TwoUserCallSetup:
    d1 = create_cloak_driver(media_permissions=True)
    d2 = create_cloak_driver(media_permissions=True)
    create_authenticated_driver(d1, user1)
    create_authenticated_driver(d2, user2)
    return TwoUserCallSetup(
        user1_driver=d1,
        user2_driver=d2,
        user1_page=VideoChatPage(d1),
        user2_page=VideoChatPage(d2),
    )


def quit_call_driver(driver: WebDriver | None) -> None:
    quit_driver(driver)


def teardown_two_user_call(setup: TwoUserCallSetup) -> None:
    quit_driver(setup.user1_driver)
    quit_driver(setup.user2_driver)
    setup.user1_driver = None


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
