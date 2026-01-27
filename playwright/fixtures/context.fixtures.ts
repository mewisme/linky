import { Browser, BrowserContext } from '@playwright/test';

import { TestUser } from './users.fixtures';

export async function createAuthenticatedContext(
  browser: Browser,
  user: TestUser,
): Promise<BrowserContext> {
  return await browser.newContext({
    storageState: user.storageStatePath,
  });
}