import { test as base, expect } from '@playwright/test';

import { launchCloakBrowser } from '../cloak-browser';

export const test = base.extend({
  browser: async ({}, use) => {
    const browser = await launchCloakBrowser();
    await use(browser);
    await browser.close();
  },
});

export { expect };
export type {
  APIRequestContext,
  Browser,
  BrowserContext,
  Locator,
  Page,
} from '@playwright/test';
