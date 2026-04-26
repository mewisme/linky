import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/http/api-error";

export function nextResponseFromActionError(error: unknown, logLabel: string): NextResponse {
  if (error instanceof ApiError) {
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
    return NextResponse.json(
      { error: "Unauthorized", message: "No authentication token found" },
      { status: 401 },
    );
  }
  Sentry.logger.error(logLabel, { error });
  return NextResponse.json(
    { error: "Internal Server Error", message: "Unexpected error" },
    { status: 500 },
  );
}
