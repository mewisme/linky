import type { ApiUserMessage } from "@/shared/types/api-message.types";

export class ApiError extends Error {
  readonly status: number;

  readonly userMessage?: ApiUserMessage;

  readonly rawBody?: string;

  constructor(
    message: string,
    options: { status: number; userMessage?: ApiUserMessage; rawBody?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.userMessage = options.userMessage;
    this.rawBody = options.rawBody;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as ApiError).name === "ApiError" &&
    typeof (error as ApiError).status === "number"
  );
}

function normalizeUserMessage(raw: unknown): ApiUserMessage | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const candidate = raw as ApiUserMessage;
  if (typeof candidate.code !== "string") {
    return undefined;
  }
  return candidate;
}

export function parseApiErrorBody(text: string): {
  message: string;
  userMessage?: ApiUserMessage;
} {
  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      error?: string;
      userMessage?: unknown;
    };
    const message =
      typeof parsed.message === "string"
        ? parsed.message
        : typeof parsed.error === "string"
          ? parsed.error
          : text;
    return {
      message,
      userMessage: normalizeUserMessage(parsed.userMessage),
    };
  } catch {
    return { message: text };
  }
}
