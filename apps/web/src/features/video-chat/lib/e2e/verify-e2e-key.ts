import { serverEnv } from "@/shared/env/server-env";

export function isE2eRelaxedCallConfigured(): boolean {
  return !!serverEnv.E2E_SECRET_KEY;
}

export function isValidE2eKey(key: string | null | undefined): boolean {
  if (!isE2eRelaxedCallConfigured()) {
    return false;
  }
  if (!key) {
    return false;
  }
  return key === serverEnv.E2E_SECRET_KEY;
}
