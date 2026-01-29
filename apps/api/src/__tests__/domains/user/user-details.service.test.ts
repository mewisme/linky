import {
  addUserInterestTags,
  clearUserInterestTags,
  patchUserDetailsForUser,
  putUserDetails,
  removeUserInterestTags,
  replaceUserInterestTags,
} from "../../../domains/user/service/user-details.service.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserDetailsByUserId = vi.fn();
const mockCreateUserDetails = vi.fn();
const mockUpdateUserDetails = vi.fn();
const mockPatchUserDetails = vi.fn();
const mockAddInterestTags = vi.fn();
const mockRemoveInterestTags = vi.fn();
const mockReplaceInterestTags = vi.fn();
const mockClearInterestTags = vi.fn();
const mockGetInterestTagsByIds = vi.fn();
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockScheduleEmbeddingRegeneration = vi.fn();

vi.mock("../../../domains/user/service/embedding-job.service.js", () => ({
  scheduleEmbeddingRegeneration: (...args: unknown[]) => mockScheduleEmbeddingRegeneration(...args),
}));

vi.mock("../../../infra/supabase/repositories/user-details.js", () => ({
  getUserDetailsByUserId: (...args: unknown[]) => mockGetUserDetailsByUserId(...args),
  createUserDetails: (...args: unknown[]) => mockCreateUserDetails(...args),
  updateUserDetails: (...args: unknown[]) => mockUpdateUserDetails(...args),
  patchUserDetails: (...args: unknown[]) => mockPatchUserDetails(...args),
  addInterestTags: (...args: unknown[]) => mockAddInterestTags(...args),
  removeInterestTags: (...args: unknown[]) => mockRemoveInterestTags(...args),
  replaceInterestTags: (...args: unknown[]) => mockReplaceInterestTags(...args),
  clearInterestTags: (...args: unknown[]) => mockClearInterestTags(...args),
}));

vi.mock("../../../infra/supabase/repositories/interest-tags.js", () => ({
  getInterestTagsByIds: (...args: unknown[]) => mockGetInterestTagsByIds(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("putUserDetails", () => {
  it("validates date_of_birth: throws when in the future", async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStr = future.toISOString().slice(0, 10);

    await expect(putUserDetails("u1", { date_of_birth: futureStr })).rejects.toThrow(
      "Date of birth cannot be in the future"
    );
    expect(mockGetUserDetailsByUserId).not.toHaveBeenCalled();
  });

  it("validates interest_tags: throws when some IDs are invalid", async () => {
    mockGetInterestTagsByIds.mockResolvedValue([{ id: "id1" }]);

    await expect(
      putUserDetails("u1", { interest_tags: ["id1", "id2", "id3"] })
    ).rejects.toThrow("Invalid interest tag IDs: id2, id3");
    expect(mockGetUserDetailsByUserId).not.toHaveBeenCalled();
  });

  it("when no existing: creates and invalidates user:profile:userId", async () => {
    mockGetUserDetailsByUserId.mockResolvedValue(null);
    const created = { user_id: "u1", bio: "Hi" };
    mockCreateUserDetails.mockResolvedValue(created);

    const result = await putUserDetails("u1", { bio: "Hi" });

    expect(result).toEqual(created);
    expect(mockCreateUserDetails).toHaveBeenCalledWith("u1", { bio: "Hi" });
    expect(mockUpdateUserDetails).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });

  it("when existing: updates and invalidates", async () => {
    mockGetUserDetailsByUserId.mockResolvedValue({ user_id: "u1" });
    const updated = { user_id: "u1", bio: "Updated" };
    mockUpdateUserDetails.mockResolvedValue(updated);

    const result = await putUserDetails("u1", { bio: "Updated" });

    expect(result).toEqual(updated);
    expect(mockUpdateUserDetails).toHaveBeenCalledWith("u1", { bio: "Updated" });
    expect(mockCreateUserDetails).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });

  it("valid interest_tags: getInterestTagsByIds matches length, then create/update proceeds", async () => {
    mockGetInterestTagsByIds.mockResolvedValue([{ id: "id1" }, { id: "id2" }]);
    mockGetUserDetailsByUserId.mockResolvedValue(null);
    mockCreateUserDetails.mockResolvedValue({ user_id: "u1" });

    await putUserDetails("u1", { interest_tags: ["id1", "id2"] });

    expect(mockCreateUserDetails).toHaveBeenCalledWith("u1", { interest_tags: ["id1", "id2"] });
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });
});

describe("patchUserDetailsForUser", () => {
  it("validates date_of_birth: throws when in the future", async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStr = future.toISOString().slice(0, 10);

    await expect(patchUserDetailsForUser("u1", { date_of_birth: futureStr })).rejects.toThrow(
      "Date of birth cannot be in the future"
    );
    expect(mockGetUserDetailsByUserId).not.toHaveBeenCalled();
  });

  it("when no existing: creates and invalidates", async () => {
    mockGetUserDetailsByUserId.mockResolvedValue(null);
    mockCreateUserDetails.mockResolvedValue({ user_id: "u1" });

    await patchUserDetailsForUser("u1", { bio: "x" });

    expect(mockCreateUserDetails).toHaveBeenCalledWith("u1", { bio: "x" });
    expect(mockPatchUserDetails).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });

  it("when existing: patches and invalidates", async () => {
    mockGetUserDetailsByUserId.mockResolvedValue({ user_id: "u1" });
    mockPatchUserDetails.mockResolvedValue({ user_id: "u1", bio: "y" });

    await patchUserDetailsForUser("u1", { bio: "y" });

    expect(mockPatchUserDetails).toHaveBeenCalledWith("u1", { bio: "y" });
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });
});

describe("addUserInterestTags", () => {
  it("calls addInterestTags and invalidates user:profile:userId", async () => {
    mockAddInterestTags.mockResolvedValue({ user_id: "u1" });

    await addUserInterestTags("u1", ["t1", "t2"]);

    expect(mockAddInterestTags).toHaveBeenCalledWith("u1", ["t1", "t2"]);
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });
});

describe("removeUserInterestTags", () => {
  it("calls removeInterestTags and invalidates", async () => {
    mockRemoveInterestTags.mockResolvedValue({});

    await removeUserInterestTags("u1", ["t1"]);

    expect(mockRemoveInterestTags).toHaveBeenCalledWith("u1", ["t1"]);
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });
});

describe("replaceUserInterestTags", () => {
  it("calls replaceInterestTags and invalidates", async () => {
    mockReplaceInterestTags.mockResolvedValue({});

    await replaceUserInterestTags("u1", ["t1"]);

    expect(mockReplaceInterestTags).toHaveBeenCalledWith("u1", ["t1"]);
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });
});

describe("clearUserInterestTags", () => {
  it("calls clearInterestTags and invalidates", async () => {
    mockClearInterestTags.mockResolvedValue({});

    await clearUserInterestTags("u1");

    expect(mockClearInterestTags).toHaveBeenCalledWith("u1");
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
    expect(mockScheduleEmbeddingRegeneration).toHaveBeenCalledWith("u1");
  });
});
