from __future__ import annotations

import re
import time
from pathlib import Path

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait, Select

from linky_e2e.config import settings
from linky_e2e.fixtures.auth_flow import authenticate_user
from linky_e2e.fixtures.users import TEST_USERS
from linky_e2e.helpers.network import block_url_pattern
from linky_e2e.helpers.waits import wait_url_matches
from linky_e2e.page_objects.user_profile import (
    bio_section,
    button_by_name,
    cancel_button_in,
    edit_button_in,
    find_by_placeholder,
    find_text,
    heading_by_name,
    hover_and_click_edit,
    hover_and_edit_bio,
    hover_section,
    interests_section,
    link_by_name,
    personal_info_section,
    profile_identity_section,
    save_button_in,
    section,
    set_viewport,
    wait_for_text,
    wait_for_url,
    wait_page_loaded,
)

pytestmark = pytest.mark.user_profile


def test_click_bio_area_enters_edit_mode(driver):
    """Profile — Bio Section: Click bio area enters edit mode"""
    """Profile — Bio Section: Click bio area enters edit mode"""
    authenticate_user(driver, TEST_USERS['user1'])
    driver.get(settings.base_url + '/user/profile')
    wait_page_loaded(driver)
    set_viewport(driver)
    sec = bio_section(driver)
    hover_and_click_edit(driver, sec)
    assert sec.find_element(By.TAG_NAME, "textarea").is_displayed()
    assert save_button_in(sec).is_displayed()
    assert cancel_button_in(sec).is_displayed()
