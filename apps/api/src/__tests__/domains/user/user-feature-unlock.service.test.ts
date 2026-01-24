import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserUnlockedFeatures } from "../../../domains/user/service/user-feature-unlock.service.js";

const mockGetLevelFeatureUnlocksUpToLevel = vi.fn();

vi.mock("../../../infra/supabase/repositories/level-feature-unlocks.js", () => ({
  getLevelFeatureUnlocksUpToLevel: (...args: unknown[]) => mockGetLevelFeatureUnlocksUpToLevel(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserUnlockedFeatures", () => {
  it("returns empty object when userId is empty or whitespace", async () => {
    expect(await getUserUnlockedFeatures("", 5)).toEqual({});
    expect(await getUserUnlockedFeatures("   ", 5)).toEqual({});
    expect(mockGetLevelFeatureUnlocksUpToLevel).not.toHaveBeenCalled();
  });

  it("returns empty object when level <= 0", async () => {
    expect(await getUserUnlockedFeatures("u1", 0)).toEqual({});
    expect(await getUserUnlockedFeatures("u1", -1)).toEqual({});
    expect(mockGetLevelFeatureUnlocksUpToLevel).not.toHaveBeenCalled();
  });

  it("returns empty object when userId is not a string", async () => {
    expect(await getUserUnlockedFeatures(1 as unknown as string, 5)).toEqual({});
  });

  it("maps unlocks to features: one unlock per feature_key", async () => {
    mockGetLevelFeatureUnlocksUpToLevel.mockResolvedValue([
      { feature_key: "video_chat", level_required: 2, feature_payload: { enabled: true } },
    ]);

    const result = await getUserUnlockedFeatures("u1", 5);

    expect(result).toEqual({
      video_chat: {
        unlocked: true,
        levelRequired: 2,
        featurePayload: { enabled: true },
      },
    });
    expect(mockGetLevelFeatureUnlocksUpToLevel).toHaveBeenCalledWith(5);
  });

  it("when multiple unlocks for same feature_key, keeps the one with highest level_required", async () => {
    mockGetLevelFeatureUnlocksUpToLevel.mockResolvedValue([
      { feature_key: "bonus", level_required: 2, feature_payload: {} },
      { feature_key: "bonus", level_required: 5, feature_payload: { amount: 10 } },
      { feature_key: "bonus", level_required: 3, feature_payload: {} },
    ]);

    const result = await getUserUnlockedFeatures("u1", 10);

    expect(result.bonus).toEqual({
      unlocked: true,
      levelRequired: 5,
      featurePayload: { amount: 10 },
    });
  });

  it("when same feature_key with lower level_required comes after higher, keeps higher", async () => {
    mockGetLevelFeatureUnlocksUpToLevel.mockResolvedValue([
      { feature_key: "x", level_required: 5, feature_payload: { v: 5 } },
      { feature_key: "x", level_required: 2, feature_payload: { v: 2 } },
    ]);

    const result = await getUserUnlockedFeatures("u1", 10);

    expect(result.x?.levelRequired).toBe(5);
    expect(result.x?.featurePayload).toEqual({ v: 5 });
  });

  it("returns multiple features when different feature_keys", async () => {
    mockGetLevelFeatureUnlocksUpToLevel.mockResolvedValue([
      { feature_key: "a", level_required: 1, feature_payload: null },
      { feature_key: "b", level_required: 3, feature_payload: {} },
    ]);

    const result = await getUserUnlockedFeatures("u1", 5);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result.a?.levelRequired).toBe(1);
    expect(result.b?.levelRequired).toBe(3);
  });

  it("when getLevelFeatureUnlocksUpToLevel throws, rethrows", async () => {
    mockGetLevelFeatureUnlocksUpToLevel.mockRejectedValue(new Error("db"));

    await expect(getUserUnlockedFeatures("u1", 5)).rejects.toThrow("db");
  });
});
