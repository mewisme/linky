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


def test_unblock_handles_api_error_gracefully(driver):
    """Blocked Users Page: Unblock handles API error gracefully"""
    """Blocked Users Page: Unblock handles API error gracefully"""
    authenticate_user(driver, TEST_USERS['user1'])
    driver.get(settings.base_url + '/connections/blocked-users')
    wait_page_loaded(driver)
    unblock_buttons = driver.find_elements(
        By.XPATH,
        "//button[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'unblock')]",
    )
    visible = [b for b in unblock_buttons if b.is_displayed()]
    if visible:
        with block_url_pattern(driver, '**/api/**/block**'):
            visible[0].click()
            wait_for_text(driver, r"unblock failed|error", timeout=5)
