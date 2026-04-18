import type { BackendUserMessage } from "@ws/shared-types";
import { toUserMessage } from "@/types/user-message.js";

export function um(
  code: string,
  keySuffix: string,
  fallback: string,
  values?: Record<string, unknown>,
): BackendUserMessage {
  const key = `api.${keySuffix}`;
  return values
    ? toUserMessage(code, { key, values }, fallback)
    : toUserMessage(code, { key }, fallback);
}

export function umDetail(code: string, detail: string): BackendUserMessage {
  return um(code, "errorDetail", detail, { detail });
}
