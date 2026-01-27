import { authenticateUser, saveStorageState } from '../../fixtures/auth.fixtures';

import { TEST_USERS } from '../../fixtures/users.fixtures';
import { test as setup } from '@playwright/test';

setup('authenticate user 1', async ({ page }) => {
  await authenticateUser(page, TEST_USERS.user1);
  await saveStorageState(page, TEST_USERS.user1);
});

setup('authenticate user 2', async ({ page }) => {
  await authenticateUser(page, TEST_USERS.user2);
  await saveStorageState(page, TEST_USERS.user2);
});