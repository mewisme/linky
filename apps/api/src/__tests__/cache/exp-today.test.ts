import { describe, it, expect, vi, beforeEach } from "vitest";
import { incrExpToday, getExpToday } from "../../infra/redis/cache/exp-today.js";

const EXP_TTL = 7 * 24 * 60 * 60;

const mockIncrBy = vi.fn().mockResolvedValue(undefined);
const mockExpire = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();

vi.mock("../../infra/redis/client.js", () => ({
  redisClient: {
    incrBy: (...args: unknown[]) => mockIncrBy(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock("../../infra/redis/timeout-wrapper.js", () => ({
  withRedisTimeout: (op: () => Promise<unknown>) => op(),
}));

describe("incrExpToday", () => {
  beforeEach(() => {
    mockIncrBy.mockClear();
    mockExpire.mockClear();
  });

  it("does not call incrBy or expire when amount <= 0", async () => {
    await incrExpToday("u1", "2024-01-15", 0);
    await incrExpToday("u1", "2024-01-15", -1);
    expect(mockIncrBy).not.toHaveBeenCalled();
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it("does not call incrBy when userLocalDateStr does not match YYYY-MM-DD", async () => {
    await incrExpToday("u1", "2024/01/15", 100);
    await incrExpToday("u1", "24-01-15", 100);
    await incrExpToday("u1", "2024-1-15", 100);
    await incrExpToday("u1", "", 100);
    expect(mockIncrBy).not.toHaveBeenCalled();
  });

  it("calls incrBy with key and Math.floor(amount), and expire with EXP_TODAY_TTL", async () => {
    await incrExpToday("u1", "2024-01-15", 100);
    expect(mockIncrBy).toHaveBeenCalledWith("user:exp_today:u1:2024-01-15", 100);
    expect(mockExpire).toHaveBeenCalledWith("user:exp_today:u1:2024-01-15", EXP_TTL);
  });

  it("floors amount", async () => {
    await incrExpToday("u1", "2024-01-15", 99.7);
    expect(mockIncrBy).toHaveBeenCalledWith("user:exp_today:u1:2024-01-15", 99);
  });
});

describe("getExpToday", () => {
  beforeEach(() => {
    mockGet.mockClear();
  });

  it("returns 0 when userLocalDateStr is invalid", async () => {
    expect(await getExpToday("u1", "invalid")).toBe(0);
    expect(await getExpToday("u1", "2024/01/15")).toBe(0);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("returns parsed number when redis get returns a numeric string", async () => {
    mockGet.mockResolvedValue("42");
    expect(await getExpToday("u1", "2024-01-15")).toBe(42);
    expect(mockGet).toHaveBeenCalledWith("user:exp_today:u1:2024-01-15");
  });

  it("returns 0 when redis get returns null", async () => {
    mockGet.mockResolvedValue(null);
    expect(await getExpToday("u1", "2024-01-15")).toBe(0);
  });

  it("returns 0 when redis get returns empty string", async () => {
    mockGet.mockResolvedValue("");
    expect(await getExpToday("u1", "2024-01-15")).toBe(0);
  });

  it("returns 0 when redis get returns non-numeric string", async () => {
    mockGet.mockResolvedValue("x");
    expect(await getExpToday("u1", "2024-01-15")).toBe(0);
  });

  it("returns 0 when redis get throws", async () => {
    mockGet.mockRejectedValue(new Error("redis error"));
    expect(await getExpToday("u1", "2024-01-15")).toBe(0);
  });
});
