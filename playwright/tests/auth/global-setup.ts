import * as fs from 'fs';
import * as path from 'path';

import { FullConfig, chromium } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';
import { authenticateUser } from '../../fixtures/auth.fixtures';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  const storageDir = path.dirname(TEST_USERS.user1.storageStatePath);

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const user1Exists = fs.existsSync(TEST_USERS.user1.storageStatePath);
  const user2Exists = fs.existsSync(TEST_USERS.user2.storageStatePath);

  if (user1Exists && user2Exists) {
    return;
  }

  const browser = await chromium.launch();

  if (!user1Exists) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      await authenticateUser(page, TEST_USERS.user1);
      await context.storageState({ path: TEST_USERS.user1.storageStatePath });
    } catch (error) {
      await browser.close();
      throw new Error(`Failed to authenticate user 1: ${error}`);
    } finally {
      await context.close();
    }
  }

  if (!user2Exists) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      await authenticateUser(page, TEST_USERS.user2);
      await context.storageState({ path: TEST_USERS.user2.storageStatePath });
    } catch (error) {
      await browser.close();
      throw new Error(`Failed to authenticate user 2: ${error}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

export default globalSetup;