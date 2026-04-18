import type { BackendUserMessage } from "@ws/shared-types";

export class ApiError extends Error {
  readonly status: number;

  readonly userMessage?: BackendUserMessage;

  readonly rawBody?: string;

  constructor(
    message: string,
    options: { status: number; userMessage?: BackendUserMessage; rawBody?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.userMessage = options.userMessage;
    this.rawBody = options.rawBody;
  }
}

export function parseApiErrorBody(text: string): {
  message: string;
  userMessage?: BackendUserMessage;
} {
  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      error?: string;
      userMessage?: BackendUserMessage;
    };
    const message =
      typeof parsed.message === "string"
        ? parsed.message
        : typeof parsed.error === "string"
          ? parsed.error
          : text;
    return {
      message,
      userMessage: parsed.userMessage,
    };
  } catch {
    return { message: text };
  }
}
