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


def test_settings_page_loads_with_cards_grid(driver):
    """Settings Navigation: Settings page loads with cards grid"""
    """Settings Navigation: Settings page loads with cards grid"""
    authenticate_user(driver, TEST_USERS['user1'])
    driver.get(settings.base_url + '/settings')
    wait_page_loaded(driver)
    heading_by_name(driver, r"settings")
    wait_for_text(driver, r"appearance")
    wait_for_text(driver, r"notifications")
