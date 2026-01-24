import { describe, it, expect, vi, beforeEach } from "vitest";
import { grantRewardsForLevel, getUserGrantedRewards } from "../../../domains/user/service/user-level-reward.service.js";

const mockGetLevelRewardsUpToLevel = vi.fn();
const mockGetUserLevelRewardIds = vi.fn();
const mockGrantUserLevelRewards = vi.fn();
const mockGetUserLevelRewards = vi.fn();

vi.mock("../../../infra/supabase/repositories/level-rewards.js", () => ({
  getLevelRewardsUpToLevel: (...args: unknown[]) => mockGetLevelRewardsUpToLevel(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-level-rewards.js", () => ({
  grantUserLevelRewards: (...args: unknown[]) => mockGrantUserLevelRewards(...args),
  getUserLevelRewardIds: (...args: unknown[]) => mockGetUserLevelRewardIds(...args),
  getUserLevelRewards: (...args: unknown[]) => mockGetUserLevelRewards(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGrantUserLevelRewards.mockResolvedValue(undefined);
});

describe("grantRewardsForLevel", () => {
  it("returns when userId is invalid", async () => {
    await grantRewardsForLevel("", 2);
    await grantRewardsForLevel("   ", 2);
    expect(mockGetLevelRewardsUpToLevel).not.toHaveBeenCalled();
  });

  it("returns when level <= 0", async () => {
    await grantRewardsForLevel("u1", 0);
    await grantRewardsForLevel("u1", -1);
    expect(mockGetLevelRewardsUpToLevel).not.toHaveBeenCalled();
  });

  it("returns when getLevelRewards(level) is empty", async () => {
    mockGetLevelRewardsUpToLevel.mockResolvedValue([]);
    await grantRewardsForLevel("u1", 2);
    expect(mockGrantUserLevelRewards).not.toHaveBeenCalled();
  });

  it("calls grantUserLevelRewards with filtered rewardIdsToGrant", async () => {
    mockGetLevelRewardsUpToLevel.mockResolvedValue([
      { id: "r1" },
      { id: "r2" },
      { id: "r3" },
    ]);
    mockGetUserLevelRewardIds.mockResolvedValue(["r1"]);

    await grantRewardsForLevel("u1", 2);

    expect(mockGrantUserLevelRewards).toHaveBeenCalledWith("u1", ["r2", "r3"]);
  });

  it("does not call grantUserLevelRewards when all rewards already granted", async () => {
    mockGetLevelRewardsUpToLevel.mockResolvedValue([{ id: "r1" }]);
    mockGetUserLevelRewardIds.mockResolvedValue(["r1"]);

    await grantRewardsForLevel("u1", 2);

    expect(mockGrantUserLevelRewards).not.toHaveBeenCalled();
  });

  it("repo throw propagates", async () => {
    mockGetLevelRewardsUpToLevel.mockRejectedValue(new Error("db"));
    await expect(grantRewardsForLevel("u1", 2)).rejects.toThrow("db");
  });
});

describe("getUserGrantedRewards", () => {
  it("returns [] when userId is invalid", async () => {
    expect(await getUserGrantedRewards("")).toEqual([]);
    expect(await getUserGrantedRewards("   ")).toEqual([]);
  });

  it("maps getUserLevelRewards to { levelRewardId, grantedAt }", async () => {
    mockGetUserLevelRewards.mockResolvedValue([
      { level_reward_id: "r1", granted_at: "2024-01-01T00:00:00Z" },
    ]);
    const r = await getUserGrantedRewards("u1");
    expect(r).toEqual([{ levelRewardId: "r1", grantedAt: "2024-01-01T00:00:00Z" }]);
  });

  it("rethrows when getUserLevelRewards throws", async () => {
    mockGetUserLevelRewards.mockRejectedValue(new Error("db"));
    await expect(getUserGrantedRewards("u1")).rejects.toThrow("db");
  });
});
