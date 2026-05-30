import { Browser, BrowserContext } from 'linky/playwright-test';

import { applyLinkyAutomationInit } from '../helpers/e2e-app-init';
import { TestUser } from './users.fixtures';

export async function createAuthenticatedContext(
  browser: Browser,
  user: TestUser,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    storageState: user.storageStatePath,
  });
  await applyLinkyAutomationInit(context);
  return context;
}