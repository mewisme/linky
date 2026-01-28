import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Namespace } from "socket.io";
import { RedisMatchmakingService } from "../../../domains/matchmaking/service/redis-matchmaking.service.js";

const mockGetUserIdByClerkId = vi.fn();
const mockZScore = vi.fn();
const mockZAdd = vi.fn();
const mockSet = vi.fn();
const mockZRem = vi.fn();
const mockDel = vi.fn();
const mockZCard = vi.fn();
const mockZRangeWithScores = vi.fn();
const mockGet = vi.fn();
const mockSAdd = vi.fn();
const mockExpire = vi.fn();
const mockSMembers = vi.fn();
const mockSDel = vi.fn();

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
    zRangeWithScores: (...args: unknown[]) => mockZRangeWithScores(...args),
    get: (...args: unknown[]) => mockGet(...args),
    sAdd: (...args: unknown[]) => mockSAdd(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
    sMembers: (...args: unknown[]) => mockSMembers(...args),
  },
}));

vi.mock("../../../infra/supabase/repositories/user-details.js", () => ({
  getInterestTags: vi.fn(() => Promise.resolve([])),
}));
vi.mock("../../../infra/supabase/repositories/favorites.js", () => ({
  getFavoritesByUserId: vi.fn(() => Promise.resolve([])),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSet.mockResolvedValue("OK");
  mockDel.mockResolvedValue(1);
  mockZRem.mockResolvedValue(1);
  mockSMembers.mockResolvedValue([]);
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

  describe("tryMatch", () => {
    const createMockSocket = (id: string, userId: string) => {
      return {
        id,
        connected: true,
        data: { userId },
        emit: vi.fn(),
      } as any;
    };

    const createMockNamespace = (sockets: Map<string, any>): Namespace => {
      return {
        sockets: {
          get: (id: string) => sockets.get(id),
        },
      } as any;
    };

    beforeEach(() => {
      mockSet.mockResolvedValue("OK");
      mockZRem.mockResolvedValue(1);
      mockDel.mockResolvedValue(1);
    });

    it("returns null when queue size < 2", async () => {
      mockZCard.mockResolvedValue(1);
      mockSet.mockResolvedValue("OK");

      const io = createMockNamespace(new Map());
      const result = await svc.tryMatch(io);

      expect(result).toBeNull();
      expect(mockZCard).toHaveBeenCalled();
    });

    it("matches two users with no interests or favorites (forced fallback)", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(2);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2");
      mockSMembers.mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]!.socketId).toBe("socket1");
      expect(result![1]!.socketId).toBe("socket2");
      expect(mockZRem).toHaveBeenCalledTimes(2);
    });

    it("does not match users when one socket is disconnected", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      socket1.connected = false;
      const socket2 = createMockSocket("socket2", "clerk2");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(2);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2");
      mockSMembers.mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).toBeNull();
      expect(mockZRem).toHaveBeenCalledWith("match:queue", "user1");
    });

    it("matches users with common interests", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(2);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2");
      mockSMembers
        .mockResolvedValueOnce(["tag1", "tag2"])
        .mockResolvedValueOnce(["tag2", "tag3"])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
    });

    it("does not match users with skip cooldown when queue has more than 2 users", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const socket3 = createMockSocket("socket3", "clerk3");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
        ["socket3", socket3],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(3);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
        { value: "user3", score: now - 200 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3")
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket3");
      mockSMembers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["user1"])
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect([result![0]!.socketId, result![1]!.socketId].sort()).toEqual(["socket1", "socket3"]);
    });

    it("forces match for exactly 2 users even with skip cooldown", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(2);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2");
      mockSMembers
        .mockResolvedValueOnce(["user2"])
        .mockResolvedValueOnce(["user1"])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(mockZRem).toHaveBeenCalledTimes(2);
    });

    it("returns null when lock cannot be acquired", async () => {
      mockZCard.mockResolvedValue(2);
      mockSet.mockResolvedValueOnce(null);

      const io = createMockNamespace(new Map());
      const result = await svc.tryMatch(io);

      expect(result).toBeNull();
    });

    it("matches user with interests to user without interests (unified scoring)", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const socket3 = createMockSocket("socket3", "clerk3");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
        ["socket3", socket3],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(3);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
        { value: "user3", score: now - 200 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3")
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2");
      mockSMembers
        .mockResolvedValueOnce(["tag1", "tag2"])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["tag3"])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
    });

    it("matches user with offline favorite to available user without signals", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(2);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2");
      mockSMembers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["user999"])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]!.socketId).toBe("socket1");
      expect(result![1]!.socketId).toBe("socket2");
    });

    it("respects skip cooldown when queue has 3+ users", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const socket3 = createMockSocket("socket3", "clerk3");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
        ["socket3", socket3],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(3);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 500 },
        { value: "user3", score: now - 200 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3")
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket3");
      mockSMembers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["user2"])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]!.socketId).toBe("socket1");
      expect(result![1]!.socketId).toBe("socket3");
    });

    it("prioritizes mutual favorites over one-way favorites and common interests", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const socket3 = createMockSocket("socket3", "clerk3");
      const socket4 = createMockSocket("socket4", "clerk4");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
        ["socket3", socket3],
        ["socket4", socket4],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(4);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 900 },
        { value: "user3", score: now - 800 },
        { value: "user4", score: now - 700 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3")
        .mockResolvedValueOnce("socket4")
        .mockResolvedValueOnce("socket3")
        .mockResolvedValueOnce("socket4");
      mockSMembers
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["user4"])
        .mockResolvedValueOnce(["user3"])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect([result![0]!.socketId, result![1]!.socketId].sort()).toEqual(["socket3", "socket4"]);
    });

    it("prioritizes one-way favorites over common interests", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const socket3 = createMockSocket("socket3", "clerk3");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
        ["socket3", socket3],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(3);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 900 },
        { value: "user3", score: now - 800 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3");
      mockSMembers
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["user3"])
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect([result![0]!.socketId, result![1]!.socketId].sort()).toEqual(["socket2", "socket3"]);
    });

    it("prioritizes common interests over fallback", async () => {
      const now = Date.now();
      const socket1 = createMockSocket("socket1", "clerk1");
      const socket2 = createMockSocket("socket2", "clerk2");
      const socket3 = createMockSocket("socket3", "clerk3");
      const sockets = new Map([
        ["socket1", socket1],
        ["socket2", socket2],
        ["socket3", socket3],
      ]);
      const io = createMockNamespace(sockets);

      mockZCard.mockResolvedValue(3);
      mockSet.mockResolvedValue("OK");
      mockZRangeWithScores.mockResolvedValue([
        { value: "user1", score: now - 1000 },
        { value: "user2", score: now - 900 },
        { value: "user3", score: now - 800 },
      ]);
      mockGet
        .mockResolvedValueOnce("socket1")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3")
        .mockResolvedValueOnce("socket2")
        .mockResolvedValueOnce("socket3");
      mockSMembers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValueOnce(["tag1"])
        .mockResolvedValue([]);

      const result = await svc.tryMatch(io);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect([result![0]!.socketId, result![1]!.socketId].sort()).toEqual(["socket2", "socket3"]);
    });
  });
});
