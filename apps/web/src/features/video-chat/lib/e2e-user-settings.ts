import { normalizeUserCallPreferences } from "@/entities/user/lib/user-settings-preferences";
import type { UsersAPI } from "@/entities/user/types/users.types";

export function buildE2eUserSettingsAttribute(
  userSettings: UsersAPI.UserSettings.GetMe.Response | null,
  e2eRelaxedCall: boolean,
): string | undefined {
  if (!e2eRelaxedCall) {
    return undefined;
  }

  return JSON.stringify({
    call: normalizeUserCallPreferences(userSettings?.call),
  });
}
