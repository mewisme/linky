import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteUser,
  getUser,
  listUsers,
  patchAdminUser,
  updateAdminUser,
} from "../../../domains/admin/service/admin-users.service.js";

import type { Database } from "../../../types/database/supabase.types.js";

const mockGetAdminUsersUnified = vi.fn();
const mockGetUserById = vi.fn();
const mockUpdateUser = vi.fn();
const mockPatchUser = vi.fn();
const mockGetOrSet = vi.fn();
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockInvalidateByPrefix = vi.fn().mockResolvedValue(undefined);
const mockClerkDeleteUser = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../infra/supabase/repositories/index.js", () => ({
  getAdminUsersUnified: (...args: unknown[]) => mockGetAdminUsersUnified(...args),
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  patchUser: (...args: unknown[]) => mockPatchUser(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  getOrSet: (...args: unknown[]) => mockGetOrSet(...args),
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
  invalidateByPrefix: (...args: unknown[]) => mockInvalidateByPrefix(...args),
}));

vi.mock("../../../infra/clerk/client.js", () => ({
  clerk: {
    users: { deleteUser: (...args: unknown[]) => mockClerkDeleteUser(...args) },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrSet.mockImplementation((_k: string, _ttl: number, fn: () => Promise<unknown>) => fn());
});

describe("listUsers", () => {
  it("delegates to getAdminUsersUnified via getOrSet and maps view shape to AdminUnifiedUser", async () => {
    const viewRows = [
      {
        user_id: "u1",
        clerk_user_id: "c1",
        email: "a@b.com",
        role: "admin",
        deleted: false,
        created_at: "2024-01-01",
        first_name: null,
        last_name: null,
        avatar_url: null,
        country: null,
        updated_at: "2024-01-01",
        deleted_at: null,
        bio: null,
        gender: null,
        date_of_birth: null,
        interest_tags: [],
        embedding_model: null,
        embedding_source_hash: null,
        embedding_updated_at: null,
        total_exp_seconds: null,
      },
    ];
    mockGetAdminUsersUnified.mockResolvedValue({ data: viewRows, count: 1 });

    const result = await listUsers({
      getAll: false,
      page: 1,
      limit: 10,
      role: "admin",
      deleted: false,
      search: "x",
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: "u1",
      email: "a@b.com",
      role: "admin",
      deleted: false,
      details: null,
      interest_tag_names: [],
      embedding: null,
      level: 1,
    });
    expect(mockGetOrSet).toHaveBeenCalledOnce();
    expect(mockGetAdminUsersUnified).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      role: "admin",
      deleted: false,
      search: "x",
      getAll: false,
    });
  });
});

describe("getUser", () => {
  it("returns getUserById result", async () => {
    const user = { id: "u1", clerk_user_id: "c1" };
    mockGetUserById.mockResolvedValue(user);

    expect(await getUser("u1")).toEqual(user);
    expect(mockGetUserById).toHaveBeenCalledWith("u1");
  });
});

describe("updateAdminUser", () => {
  it("calls updateUser then invalidateByPrefix(admin:users:) and invalidate(user:profile:id)", async () => {
    const updated = { id: "u1", role: "admin" };
    mockUpdateUser.mockResolvedValue(updated);

    const result = await updateAdminUser("u1", { role: "admin" });

    expect(result).toEqual(updated);
    expect(mockUpdateUser).toHaveBeenCalledWith("u1", { role: "admin" });
    expect(mockInvalidateByPrefix).toHaveBeenCalledWith("admin:users:");
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });

  it("when updateUser throws, does not call invalidate", async () => {
    mockUpdateUser.mockRejectedValue(new Error("db"));

    await expect(updateAdminUser("u1", { role: "admin" })).rejects.toThrow("db");
    expect(mockInvalidateByPrefix).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe("patchAdminUser", () => {
  it("calls patchUser then invalidateByPrefix and invalidate", async () => {
    const updated = { id: "u1", role: "member" };
    mockPatchUser.mockResolvedValue(updated);

    const result = await patchAdminUser("u1", { role: "member" });

    expect(result).toEqual(updated);
    expect(mockPatchUser).toHaveBeenCalledWith("u1", { role: "member" });
    expect(mockInvalidateByPrefix).toHaveBeenCalledWith("admin:users:");
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });
});

describe("deleteUser", () => {
  it("calls Clerk deleteUser only and does not update database", async () => {
    const user = {
      id: "u1",
      clerk_user_id: "clerk_abc",
      deleted: false,
      role: "member",
    };
    mockGetUserById.mockResolvedValue(user);
    mockClerkDeleteUser.mockResolvedValue(undefined);

    await deleteUser("u1");

    expect(mockGetUserById).toHaveBeenCalledWith("u1");
    expect(mockClerkDeleteUser).toHaveBeenCalledWith("clerk_abc");
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockPatchUser).not.toHaveBeenCalled();
    expect(mockInvalidateByPrefix).not.toHaveBeenCalled();
  });

  it("throws when user not found", async () => {
    mockGetUserById.mockResolvedValue(null);

    await expect(deleteUser("u1")).rejects.toThrow("User not found");
    expect(mockClerkDeleteUser).not.toHaveBeenCalled();
  });

  it("throws when user already deleted", async () => {
    mockGetUserById.mockResolvedValue({
      id: "u1",
      clerk_user_id: "clerk_abc",
      deleted: true,
      role: "member",
    });

    await expect(deleteUser("u1")).rejects.toThrow("User already deleted");
    expect(mockClerkDeleteUser).not.toHaveBeenCalled();
  });

  it("throws when user is admin", async () => {
    mockGetUserById.mockResolvedValue({
      id: "u1",
      clerk_user_id: "clerk_abc",
      deleted: false,
      role: "admin",
    });

    await expect(deleteUser("u1")).rejects.toThrow("Admin users cannot be deleted");
    expect(mockClerkDeleteUser).not.toHaveBeenCalled();
  });
});

describe("users.allow removal", () => {
  it("users table Row type does not include allow (type-level)", () => {
    type UsersRow = Database["public"]["Tables"]["users"]["Row"];
    type AssertNoAllow = "allow" extends keyof UsersRow ? never : true;
    const _: AssertNoAllow = true;
    expect(_).toBe(true);
  });
});
