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

type ApiErrorBody = {
  message?: string;
  error?: string;
  userMessage?: unknown;
};

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

function parseFirstJsonObject(text: string): ApiErrorBody | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as ApiErrorBody;
  } catch {
    const firstObject = trimmed.match(/^\{[\s\S]*?\}(?=\s*\{|$)/)?.[0];
    if (!firstObject) {
      return null;
    }
    try {
      return JSON.parse(firstObject) as ApiErrorBody;
    } catch {
      return null;
    }
  }
}

export function parseApiErrorBody(text: string): {
  message: string;
  userMessage?: ApiUserMessage;
} {
  const parsed = parseFirstJsonObject(text);
  if (!parsed) {
    return { message: text };
  }

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
}

export function apiErrorFromResponseText(
  text: string,
  status: number,
  fallbackMessage?: string,
): ApiError {
  const parsed = parseApiErrorBody(text || "");
  return new ApiError(parsed.message || fallbackMessage || "Request failed", {
    status,
    userMessage: parsed.userMessage,
    rawBody: text || undefined,
  });
}

export async function readJsonOrThrowApiError<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw apiErrorFromResponseText(text, res.status, res.statusText);
  }
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

function readDuckTypedApiError(error: object): ApiError | null {
  const candidate = error as Partial<ApiError>;
  if (typeof candidate.status !== "number") {
    return null;
  }
  if (!candidate.userMessage && !candidate.rawBody && !candidate.message) {
    return null;
  }
  if (candidate.userMessage || candidate.rawBody) {
    return new ApiError(candidate.message || "Request failed", {
      status: candidate.status,
      userMessage: candidate.userMessage,
      rawBody: candidate.rawBody,
    });
  }
  return null;
}

export function isApiError(error: unknown): error is ApiError {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if (
    (error as ApiError).name === "ApiError" &&
    typeof (error as ApiError).status === "number"
  ) {
    return true;
  }
  return readDuckTypedApiError(error) !== null;
}

export function coerceApiError(error: unknown): ApiError | null {
  if (typeof error === "object" && error !== null) {
    if (
      (error as ApiError).name === "ApiError" &&
      typeof (error as ApiError).status === "number"
    ) {
      return error as ApiError;
    }

    const duckTyped = readDuckTypedApiError(error);
    if (duckTyped) {
      return duckTyped;
    }
  }

  if (error instanceof Error) {
    const fromMessage = parseFirstJsonObject(error.message);
    if (fromMessage) {
      const parsed = parseApiErrorBody(error.message);
      return new ApiError(parsed.message, {
        status: 500,
        userMessage: parsed.userMessage,
        rawBody: error.message,
      });
    }
  }

  return null;
}
