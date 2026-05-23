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


def test_upload_an_invalid_file_shows_error_toast(driver):
    """Profile — Avatar Management: Upload an invalid file shows error toast"""
    """Profile — Avatar Management: Upload an invalid file shows error toast"""
    authenticate_user(driver, TEST_USERS['user1'])
    driver.get(settings.base_url + '/user/profile')
    wait_page_loaded(driver)
    TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)
    invalid_path = TEST_DATA_DIR / "invalid-upload.txt"
    invalid_path.write_text("this is not an image", encoding="utf-8")
    file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]#avatar-upload')
    file_input.send_keys(str(invalid_path.resolve()))
    wait_for_text(driver, r"invalid image", timeout=5)
