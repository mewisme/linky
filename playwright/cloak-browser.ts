import { ensureBinary, launch } from 'cloakbrowser';
import type { LaunchOptions } from 'cloakbrowser';
import type { Browser } from 'playwright-core';

export function cloakLaunchOptions(): LaunchOptions {
  return {
    headless:
      process.env.PWHEADED !== '1' &&
      process.env.PWDEBUG !== '1' &&
      process.env.HEADED !== '1',
  };
}

export async function launchCloakBrowser(): Promise<Browser> {
  await ensureBinary();
  return launch(cloakLaunchOptions());
}
