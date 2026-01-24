import { describe, it, expect } from "vitest";
import { hashFilters } from "../../infra/redis/cache/hash.js";

describe("hashFilters", () => {
  it("returns 16-character hex string", () => {
    const h = hashFilters({ a: 1 });
    expect(h).toMatch(/^[a-f0-9]{16}$/);
  });

  it("same input produces same hash", () => {
    const input = { type: "overview", days: 7 };
    expect(hashFilters(input)).toBe(hashFilters(input));
  });

  it("different inputs produce different hashes", () => {
    const h1 = hashFilters({ type: "overview", days: 7 });
    const h2 = hashFilters({ type: "overview", days: 14 });
    const h3 = hashFilters({ type: "visitors", days: 7 });
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h2).not.toBe(h3);
  });

  it("key order does not affect hash (object key sorted)", () => {
    expect(hashFilters({ a: 1, b: 2 })).toBe(hashFilters({ b: 2, a: 1 }));
  });

  it("undefined values are omitted from normalization", () => {
    expect(hashFilters({ a: 1, b: undefined })).toBe(hashFilters({ a: 1 }));
  });

  it("null is preserved", () => {
    const h = hashFilters({ a: null });
    expect(h).toMatch(/^[a-f0-9]{16}$/);
    expect(hashFilters({ a: null })).toBe(h);
  });

  it("nested objects are normalized", () => {
    expect(hashFilters({ x: { b: 2, a: 1 } })).toBe(hashFilters({ x: { a: 1, b: 2 } }));
  });

  it("arrays are handled", () => {
    const h = hashFilters({ ids: ["a", "b"] });
    expect(h).toMatch(/^[a-f0-9]{16}$/);
    expect(hashFilters({ ids: ["a", "b"] })).toBe(h);
  });

  it("Date is stringified to ISO", () => {
    const d = new Date("2024-06-15T12:00:00.000Z");
    const h = hashFilters({ at: d });
    expect(h).toMatch(/^[a-f0-9]{16}$/);
    expect(hashFilters({ at: new Date("2024-06-15T12:00:00.000Z") })).toBe(h);
  });

  it("primitives are hashed", () => {
    expect(hashFilters(1)).toMatch(/^[a-f0-9]{16}$/);
    expect(hashFilters("x")).toMatch(/^[a-f0-9]{16}$/);
    expect(hashFilters(true)).toMatch(/^[a-f0-9]{16}$/);
  });
});
