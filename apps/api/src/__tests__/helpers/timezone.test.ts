import { describe, it, expect } from "vitest";
import { isValidTimezone, toUserLocalDateString } from "../../utils/timezone.js";

describe("isValidTimezone", () => {
  it("returns true for Europe/Paris", () => {
    expect(isValidTimezone("Europe/Paris")).toBe(true);
  });

  it("returns false for Invalid/Zone", () => {
    expect(isValidTimezone("Invalid/Zone")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidTimezone("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isValidTimezone("   ")).toBe(false);
  });

  it("returns false for non-string (guarded by typeof)", () => {
    expect(isValidTimezone(1 as unknown as string)).toBe(false);
    expect(isValidTimezone(null as unknown as string)).toBe(false);
  });
});

describe("toUserLocalDateString", () => {
  it("returns YYYY-MM-DD for UTC at 2024-06-15 12:00:00Z", () => {
    const d = new Date("2024-06-15T12:00:00.000Z");
    expect(toUserLocalDateString(d, "UTC")).toBe("2024-06-15");
  });

  it("returns YYYY-MM-DD for Europe/Paris at 2024-06-15 12:00:00Z", () => {
    const d = new Date("2024-06-15T12:00:00.000Z");
    expect(toUserLocalDateString(d, "Europe/Paris")).toBe("2024-06-15");
  });

  it("returns correct date for America/New_York at boundary (2024-01-01 04:00:00Z = Dec 31 23:00 ET)", () => {
    const d = new Date("2024-01-01T04:00:00.000Z");
    expect(toUserLocalDateString(d, "America/New_York")).toBe("2023-12-31");
  });

  it("uses sv-SE format (YYYY-MM-DD)", () => {
    const d = new Date("2024-03-15T00:00:00.000Z");
    const out = toUserLocalDateString(d, "UTC");
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out).toBe("2024-03-15");
  });
});
