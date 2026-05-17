import { describe, expect, it } from "vitest";

import { parseCorsOrigin, parseCorsOriginStrict } from "@/utils/cors.js";

describe("parseCorsOrigin", () => {
  it("returns wildcard for unset value", () => {
    expect(parseCorsOrigin(undefined)).toBe("*");
    expect(parseCorsOrigin("")).toBe("*");
  });

  it("returns wildcard for explicit wildcard inputs", () => {
    expect(parseCorsOrigin("*")).toBe("*");
    expect(parseCorsOrigin("wildcard")).toBe("*");
    expect(parseCorsOrigin("WILDCARD")).toBe("*");
  });

  it("returns single origin string", () => {
    expect(parseCorsOrigin("https://example.com")).toBe("https://example.com");
  });

  it("returns array for comma-separated list", () => {
    expect(parseCorsOrigin("https://a.com,https://b.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("supports bracketed array notation", () => {
    expect(parseCorsOrigin("[https://a.com, https://b.com]")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });

  it("returns wildcard for empty bracket list", () => {
    expect(parseCorsOrigin("[]")).toBe("*");
  });
});

describe("parseCorsOriginStrict", () => {
  it("passes through permissive parsing in non-production", () => {
    expect(parseCorsOriginStrict(undefined, "development")).toBe("*");
    expect(parseCorsOriginStrict("*", "development")).toBe("*");
    expect(parseCorsOriginStrict("wildcard", "test")).toBe("*");
    expect(parseCorsOriginStrict("https://example.com", "development")).toBe(
      "https://example.com",
    );
  });

  it("throws in production when CORS_ORIGIN is unset", () => {
    expect(() => parseCorsOriginStrict(undefined, "production")).toThrow(
      /CORS_ORIGIN must be set/,
    );
    expect(() => parseCorsOriginStrict("", "production")).toThrow(
      /CORS_ORIGIN must be set/,
    );
  });

  it("throws in production when CORS_ORIGIN is wildcard", () => {
    expect(() => parseCorsOriginStrict("*", "production")).toThrow(
      /wildcard/,
    );
    expect(() => parseCorsOriginStrict("wildcard", "production")).toThrow(
      /wildcard/,
    );
    expect(() => parseCorsOriginStrict("WILDCARD", "production")).toThrow(
      /wildcard/,
    );
  });

  it("throws in production when bracketed list is empty", () => {
    expect(() => parseCorsOriginStrict("[]", "production")).toThrow(
      /CORS_ORIGIN must be set/,
    );
  });

  it("returns explicit allowlist in production", () => {
    expect(parseCorsOriginStrict("https://example.com", "production")).toBe(
      "https://example.com",
    );
    expect(
      parseCorsOriginStrict("https://a.com,https://b.com", "production"),
    ).toEqual(["https://a.com", "https://b.com"]);
    expect(
      parseCorsOriginStrict("[https://a.com, https://b.com]", "production"),
    ).toEqual(["https://a.com", "https://b.com"]);
  });
});
