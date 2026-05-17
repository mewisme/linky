import { describe, expect, it } from "vitest";

import { unexpectedServerUserMessage } from "@/lib/api-user-message.js";

describe("unexpectedServerUserMessage", () => {
  it("returns generic message in production", () => {
    const message = unexpectedServerUserMessage("connection refused", "production");
    expect(message).toEqual({
      code: "UNEXPECTED_SERVER",
      i18n: { key: "api.internalServerError" },
      fallbackMessage: "An unexpected error occurred",
    });
  });

  it("returns error detail in development", () => {
    const message = unexpectedServerUserMessage("connection refused", "development");
    expect(message).toEqual({
      code: "UNEXPECTED_SERVER",
      i18n: { key: "api.errorDetail", values: { detail: "connection refused" } },
      fallbackMessage: "connection refused",
    });
  });

  it("returns error detail in test", () => {
    const message = unexpectedServerUserMessage("timeout", "test");
    expect(message).toEqual({
      code: "UNEXPECTED_SERVER",
      i18n: { key: "api.errorDetail", values: { detail: "timeout" } },
      fallbackMessage: "timeout",
    });
  });
});
