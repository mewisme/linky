import { describe, it, expect, vi, beforeEach } from "vitest";
import { grantFreezesForLevel } from "../../../domains/user/service/user-streak-freeze.service.js";

const mockGetLevelFeatureUnlocksAtLevel = vi.fn();
const mockGetGrantedFreezeUnlockIds = vi.fn();
const mockAddAvailableFreezes = vi.fn();
const mockInsertFreezeGrant = vi.fn();

vi.mock("../../../infra/supabase/repositories/level-feature-unlocks.js", () => ({
  getLevelFeatureUnlocksAtLevel: (...args: unknown[]) => mockGetLevelFeatureUnlocksAtLevel(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-streak-freeze.js", () => ({
  addAvailableFreezes: (...args: unknown[]) => mockAddAvailableFreezes(...args),
  getGrantedFreezeUnlockIds: (...args: unknown[]) => mockGetGrantedFreezeUnlockIds(...args),
  insertFreezeGrant: (...args: unknown[]) => mockInsertFreezeGrant(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetGrantedFreezeUnlockIds.mockResolvedValue([]);
  mockAddAvailableFreezes.mockResolvedValue(undefined);
  mockInsertFreezeGrant.mockResolvedValue(undefined);
});

describe("grantFreezesForLevel", () => {
  it("no repo calls when userId is invalid", async () => {
    await grantFreezesForLevel("", 2);
    await grantFreezesForLevel("   ", 2);
    expect(mockGetLevelFeatureUnlocksAtLevel).not.toHaveBeenCalled();
  });

  it("no repo calls when level <= 0", async () => {
    await grantFreezesForLevel("u1", 0);
    await grantFreezesForLevel("u1", -1);
    expect(mockGetLevelFeatureUnlocksAtLevel).not.toHaveBeenCalled();
  });

  it("no addAvailableFreezes/insertFreezeGrant when getLevelFeatureUnlocksAtLevel returns []", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([]);
    await grantFreezesForLevel("u1", 2);
    expect(mockAddAvailableFreezes).not.toHaveBeenCalled();
    expect(mockInsertFreezeGrant).not.toHaveBeenCalled();
  });

  it("no add when no unlock has feature_key streak_freeze", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([
      { id: "x", feature_key: "other", feature_payload: {} },
    ]);
    await grantFreezesForLevel("u1", 2);
    expect(mockAddAvailableFreezes).not.toHaveBeenCalled();
  });

  it("addAvailableFreezes(userId, 3) and insertFreezeGrant when freezes_granted is 3", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([
      { id: "u1", feature_key: "streak_freeze", feature_payload: { freezes_granted: 3 } },
    ]);
    await grantFreezesForLevel("u1", 2);
    expect(mockAddAvailableFreezes).toHaveBeenCalledWith("u1", 3);
    expect(mockInsertFreezeGrant).toHaveBeenCalledWith("u1", "u1");
  });

  it("default 1 when freezes_granted missing", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([
      { id: "u2", feature_key: "streak_freeze", feature_payload: {} },
    ]);
    await grantFreezesForLevel("u1", 2);
    expect(mockAddAvailableFreezes).toHaveBeenCalledWith("u1", 1);
  });

  it("skips when freezes_granted 0 or negative", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([
      { id: "a", feature_key: "streak_freeze", feature_payload: { freezes_granted: 0 } },
      { id: "b", feature_key: "streak_freeze", feature_payload: { freezes_granted: -1 } },
    ]);
    await grantFreezesForLevel("u1", 2);
    expect(mockAddAvailableFreezes).not.toHaveBeenCalled();
  });

  it("floors freezes_granted 2.7 to 2", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([
      { id: "u3", feature_key: "streak_freeze", feature_payload: { freezes_granted: 2.7 } },
    ]);
    await grantFreezesForLevel("u1", 2);
    expect(mockAddAvailableFreezes).toHaveBeenCalledWith("u1", 2);
  });

  it("skips unlock already in grantedIds", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([
      { id: "already", feature_key: "streak_freeze", feature_payload: { freezes_granted: 2 } },
    ]);
    mockGetGrantedFreezeUnlockIds.mockResolvedValue(["already"]);
    await grantFreezesForLevel("u1", 2);
    expect(mockAddAvailableFreezes).not.toHaveBeenCalled();
  });

  it("repo throw propagates", async () => {
    mockGetLevelFeatureUnlocksAtLevel.mockResolvedValue([
      { id: "u", feature_key: "streak_freeze", feature_payload: { freezes_granted: 1 } },
    ]);
    mockAddAvailableFreezes.mockRejectedValue(new Error("db"));
    await expect(grantFreezesForLevel("u1", 2)).rejects.toThrow("db");
  });
});
