import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisMatchmakingService } from "../../../domains/matchmaking/service/redis-matchmaking.service.js";

const mockGetUserIdByClerkId = vi.fn();
const mockZScore = vi.fn();
const mockZAdd = vi.fn();
const mockSet = vi.fn();
const mockZRem = vi.fn();
const mockDel = vi.fn();
const mockZCard = vi.fn();

vi.mock("../../../infra/supabase/repositories/call-history.js", () => ({
  getUserIdByClerkId: (...args: unknown[]) => mockGetUserIdByClerkId(...args),
}));

vi.mock("../../../infra/redis/client.js", () => ({
  redisClient: {
    zScore: (...args: unknown[]) => mockZScore(...args),
    zAdd: (...args: unknown[]) => mockZAdd(...args),
    set: (...args: unknown[]) => mockSet(...args),
    zRem: (...args: unknown[]) => mockZRem(...args),
    del: (...args: unknown[]) => mockDel(...args),
    zCard: (...args: unknown[]) => mockZCard(...args),
  },
}));

vi.mock("../../../infra/supabase/repositories/user-details.js", () => ({
  getInterestTags: () => Promise.resolve([]),
}));
vi.mock("../../../infra/supabase/repositories/favorites.js", () => ({
  getFavoritesByUserId: () => Promise.resolve([]),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RedisMatchmakingService", () => {
  let svc: RedisMatchmakingService;

  beforeEach(() => {
    svc = new RedisMatchmakingService();
  });

  describe("enqueue", () => {
    it("returns false when socket has no clerkUserId (data.userId)", async () => {
      const socket = { id: "s1", data: {} } as any;

      const result = await svc.enqueue(socket);

      expect(result).toBe(false);
      expect(mockGetUserIdByClerkId).not.toHaveBeenCalled();
    });

    it("returns false when getUserIdByClerkId returns null", async () => {
      mockGetUserIdByClerkId.mockResolvedValue(null);
      const socket = { id: "s1", data: { userId: "clerk_1" } } as any;

      const result = await svc.enqueue(socket);

      expect(result).toBe(false);
      expect(mockGetUserIdByClerkId).toHaveBeenCalledWith("clerk_1");
    });
  });

  describe("dequeue", () => {
    it("returns false when zRem removes 0 and del is called", async () => {
      mockZRem.mockResolvedValue(0);
      mockDel.mockResolvedValue(undefined);

      const result = await svc.dequeue("u1");

      expect(result).toBe(false);
      expect(mockZRem).toHaveBeenCalledWith("match:queue", "u1");
      expect(mockDel).toHaveBeenCalledWith("match:socket:u1");
    });

    it("returns true when zRem removes 1", async () => {
      mockZRem.mockResolvedValue(1);
      mockDel.mockResolvedValue(undefined);

      const result = await svc.dequeue("u1");

      expect(result).toBe(true);
    });
  });

  describe("isInQueue", () => {
    it("returns true when zScore returns non-null", async () => {
      mockZScore.mockResolvedValue(12345);

      const result = await svc.isInQueue("u1");

      expect(result).toBe(true);
      expect(mockZScore).toHaveBeenCalledWith("match:queue", "u1");
    });

    it("returns false when zScore returns null", async () => {
      mockZScore.mockResolvedValue(null);

      const result = await svc.isInQueue("u1");

      expect(result).toBe(false);
    });

    it("returns false when zScore throws", async () => {
      mockZScore.mockRejectedValue(new Error("redis"));

      const result = await svc.isInQueue("u1");

      expect(result).toBe(false);
    });
  });

  describe("getQueueSize", () => {
    it("returns zCard result when success", async () => {
      mockZCard.mockResolvedValue(5);

      const result = await svc.getQueueSize();

      expect(result).toBe(5);
      expect(mockZCard).toHaveBeenCalledWith("match:queue");
    });

    it("returns 0 when zCard throws", async () => {
      mockZCard.mockRejectedValue(new Error("redis"));

      const result = await svc.getQueueSize();

      expect(result).toBe(0);
    });
  });
});
