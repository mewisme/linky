import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrSet, invalidate } from "../../infra/redis/cache/index.js";

const mockGet = vi.fn();
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockDel = vi.fn().mockResolvedValue(undefined);

vi.mock("../../infra/redis/client.js", () => ({
  redisClient: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));

vi.mock("../../infra/redis/timeout-wrapper.js", () => ({
  withRedisTimeout: (op: () => Promise<unknown>) => op(),
}));

describe("getOrSet", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it("on cache miss: calls fetchFromDb, then set with JSON.stringify(data) and EX ttlSeconds", async () => {
    mockGet.mockResolvedValue(null);
    const data = { x: 1 };
    const fetchFromDb = vi.fn().mockResolvedValue(data);

    const result = await getOrSet("test-key", 60, fetchFromDb);

    expect(result).toEqual(data);
    expect(fetchFromDb).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith("test-key", JSON.stringify(data), { EX: 60 });
  });

  it("on cache hit: returns parsed value and does not call fetchFromDb", async () => {
    const cached = { a: 1 };
    mockGet.mockResolvedValue(JSON.stringify(cached));

    const fetchFromDb = vi.fn();

    const result = await getOrSet("test-key", 60, fetchFromDb);

    expect(result).toEqual(cached);
    expect(fetchFromDb).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("on cache hit with invalid JSON: calls fetchFromDb and sets the result", async () => {
    mockGet.mockResolvedValue("not valid json");
    const data = { y: 2 };
    const fetchFromDb = vi.fn().mockResolvedValue(data);

    const result = await getOrSet("test-key", 120, fetchFromDb);

    expect(result).toEqual(data);
    expect(fetchFromDb).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith("test-key", JSON.stringify(data), { EX: 120 });
  });

  it("on cache read failure: calls fetchFromDb (fall through)", async () => {
    mockGet.mockRejectedValue(new Error("redis get failed"));
    const data = { z: 3 };
    const fetchFromDb = vi.fn().mockResolvedValue(data);

    const result = await getOrSet("test-key", 60, fetchFromDb);

    expect(result).toEqual(data);
    expect(fetchFromDb).toHaveBeenCalledOnce();
    expect(mockSet).toHaveBeenCalledWith("test-key", JSON.stringify(data), { EX: 60 });
  });
});

describe("invalidate", () => {
  beforeEach(() => {
    mockDel.mockClear();
  });

  it("calls del with the resolved key", async () => {
    await invalidate("user:progress:u1:Europe/Paris");
    expect(mockDel).toHaveBeenCalledWith("user:progress:u1:Europe/Paris");
  });
});
