import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { bffInternalErrorResponse, bffUnauthorizedResponse } from "@/lib/http/bff-response";
import { isApiError } from "@/lib/http/api-error";

export function nextResponseFromActionError(error: unknown, logLabel: string): NextResponse {
  if (isApiError(error)) {
    return NextResponse.json(
      {
        error: error.message,
        message: error.message,
        ...(error.userMessage ? { userMessage: error.userMessage } : {}),
      },
      { status: error.status },
    );
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return bffUnauthorizedResponse();
  }
  Sentry.logger.error(logLabel, { error });
  return bffInternalErrorResponse("unexpectedError", "An unexpected error occurred");
}
