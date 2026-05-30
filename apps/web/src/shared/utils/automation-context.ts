export const LINKY_E2E_STORAGE_KEY = "linky:e2e";

declare global {
  interface Window {
    __LINKY_E2E__?: boolean;
  }
}

export function isAutomationContext(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.__LINKY_E2E__ === true) {
    return true;
  }
  if (navigator.webdriver) {
    return true;
  }
  try {
    return window.localStorage.getItem(LINKY_E2E_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isPageBackgrounded(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  if (isAutomationContext()) {
    return false;
  }
  return document.hidden;
}

export function pageVisibilityForSocket(): "foreground" | "background" {
  return isPageBackgrounded() ? "background" : "foreground";
}
