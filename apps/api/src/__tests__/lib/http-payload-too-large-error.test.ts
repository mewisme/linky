import { describe, expect, it } from "vitest";

import { isPayloadTooLargeError } from "@/lib/http-payload-too-large-error.js";

describe("isPayloadTooLargeError", () => {
  it("returns true for body-parser entity.too.large", () => {
    expect(isPayloadTooLargeError({ type: "entity.too.large", status: 413 })).toBe(true);
  });

  it("returns true when status is 413", () => {
    expect(isPayloadTooLargeError({ status: 413 })).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isPayloadTooLargeError(new Error("other"))).toBe(false);
    expect(isPayloadTooLargeError(null)).toBe(false);
  });
});
