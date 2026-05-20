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

export function parseApiErrorBody(text: string): {
  message: string;
  userMessage?: ApiUserMessage;
} {
  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      error?: string;
      userMessage?: ApiUserMessage;
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
