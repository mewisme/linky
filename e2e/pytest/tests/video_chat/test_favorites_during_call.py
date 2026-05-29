import pytest

from linky_e2e.fixtures.call import TwoUserCallSetup
from tests.video_chat._helpers import assert_visible

pytestmark = pytest.mark.video_chat


def test_add_favorite_notifies_peer(active_call: TwoUserCallSetup):
    """Favorites During Call: Add favorite notifies peer"""
    active_call.user1_page.add_favorite_button().click()
    assert_visible(active_call.user1_page.add_favorite_button())


def test_remove_favorite_notifies_peer(active_call: TwoUserCallSetup):
    """Favorites During Call: Remove favorite notifies peer"""
    active_call.user1_page.remove_favorite_button().click()
    assert_visible(active_call.user1_page.remove_favorite_button())
