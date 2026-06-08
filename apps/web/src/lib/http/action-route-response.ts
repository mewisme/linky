import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { bffInternalErrorResponse, bffUnauthorizedResponse } from "@/lib/http/bff-response";
import { coerceApiError } from "@/lib/http/api-error";

export function nextResponseFromActionError(error: unknown, logLabel: string): NextResponse {
  const apiError = coerceApiError(error);
  if (apiError) {
    return NextResponse.json(
      {
        error: apiError.message,
        message: apiError.message,
        ...(apiError.userMessage ? { userMessage: apiError.userMessage } : {}),
      },
      { status: apiError.status },
    );
  }

  if (error instanceof Error && error.message === "Unauthorized") {
    return bffUnauthorizedResponse();
  }

  Sentry.logger.error(logLabel, { error });
  return bffInternalErrorResponse("unexpectedError", "An unexpected error occurred");
}
