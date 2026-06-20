import { NextResponse } from "next/server";

import type { ApiUserMessage } from "@/shared/types/api-message.types";

function userMessage(
  code: string,
  key: string,
  fallback: string,
): ApiUserMessage {
  return {
    code,
    i18n: { key: `api.${key}` },
    fallbackMessage: fallback,
  };
}

export function bffMissingAuthResponse() {
  const um = userMessage(
    "MISSING_AUTH",
    "missingAuth",
    "Missing authentication",
  );
  return NextResponse.json(
    { error: "Unauthorized", message: um.fallbackMessage, userMessage: um },
    { status: 401 },
  );
}

export function bffUnauthorizedResponse() {
  const um = userMessage("UNAUTHORIZED", "unauthorized", "Unauthorized");
  return NextResponse.json(
    { error: "Unauthorized", message: um.fallbackMessage, userMessage: um },
    { status: 401 },
  );
}

export function bffInternalErrorResponse(key: string, fallback: string) {
  const um = userMessage("INTERNAL_ERROR", key, fallback);
  return NextResponse.json(
    { error: "Internal Server Error", message: fallback, userMessage: um },
    { status: 500 },
  );
}
