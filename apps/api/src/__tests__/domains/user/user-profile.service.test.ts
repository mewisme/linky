import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserProfileAggregateByClerkUserId } from "../../../domains/user/service/user-profile.service.js";

const mockGetUserIdByClerkId = vi.fn();
const mockGetOrSet = vi.fn();
const mockGetUserById = vi.fn();
const mockGetUserDetailsWithTags = vi.fn();
const mockGetUserSettingsByUserId = vi.fn();

vi.mock("../../../infra/supabase/repositories/call-history.js", () => ({
  getUserIdByClerkId: (...args: unknown[]) => mockGetUserIdByClerkId(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  getOrSet: (...args: unknown[]) => mockGetOrSet(...args),
}));

vi.mock("../../../infra/supabase/repositories/index.js", () => ({
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  getUserDetailsWithTags: (...args: unknown[]) => mockGetUserDetailsWithTags(...args),
  getUserSettingsByUserId: (...args: unknown[]) => mockGetUserSettingsByUserId(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrSet.mockImplementation((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn());
});

describe("getUserProfileAggregateByClerkUserId", () => {
  it("returns null when clerkUserId is empty or whitespace", async () => {
    expect(await getUserProfileAggregateByClerkUserId("")).toBeNull();
    expect(await getUserProfileAggregateByClerkUserId("   ")).toBeNull();
    expect(mockGetUserIdByClerkId).not.toHaveBeenCalled();
  });

  it("returns null when getUserIdByClerkId returns null", async () => {
    mockGetUserIdByClerkId.mockResolvedValue(null);

    expect(await getUserProfileAggregateByClerkUserId("clerk_abc")).toBeNull();
    expect(mockGetOrSet).not.toHaveBeenCalled();
  });

  it("returns null when clerkUserId is not a string", async () => {
    expect(await getUserProfileAggregateByClerkUserId(1 as unknown as string)).toBeNull();
  });

  it("when user not found in aggregate callback, returns null", async () => {
    mockGetUserIdByClerkId.mockResolvedValue("u1");
    mockGetUserById.mockResolvedValue(null);
    mockGetUserDetailsWithTags.mockResolvedValue({});
    mockGetUserSettingsByUserId.mockResolvedValue({});

    const result = await getUserProfileAggregateByClerkUserId("clerk_1");

    expect(result).toBeNull();
    expect(mockGetOrSet).toHaveBeenCalledOnce();
  });

  it("returns { user, details, settings } from getOrSet callback when user exists", async () => {
    mockGetUserIdByClerkId.mockResolvedValue("u1");
    const user = { id: "u1", clerk_user_id: "clerk_1" };
    const details = { user_id: "u1", bio: "x" };
    const settings = { user_id: "u1", language: "en" };
    mockGetUserById.mockResolvedValue(user);
    mockGetUserDetailsWithTags.mockResolvedValue(details);
    mockGetUserSettingsByUserId.mockResolvedValue(settings);

    const result = await getUserProfileAggregateByClerkUserId("clerk_1");

    expect(result).toEqual({ user, details, settings });
    expect(mockGetUserById).toHaveBeenCalledWith("u1");
    expect(mockGetUserDetailsWithTags).toHaveBeenCalledWith("u1");
    expect(mockGetUserSettingsByUserId).toHaveBeenCalledWith("u1");
  });

  it("uses getOrSet with user:profile:userId key", async () => {
    mockGetUserIdByClerkId.mockResolvedValue("u1");
    mockGetUserById.mockResolvedValue({ id: "u1" });
    mockGetUserDetailsWithTags.mockResolvedValue(null);
    mockGetUserSettingsByUserId.mockResolvedValue(null);

    await getUserProfileAggregateByClerkUserId("clerk_1");

    expect(mockGetOrSet).toHaveBeenCalledWith(
      "user:profile:u1",
      expect.any(Number),
      expect.any(Function)
    );
  });
});
