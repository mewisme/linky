import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUser,
  listUsers,
  patchAdminUser,
  updateAdminUser,
} from "../../../domains/admin/service/admin-users.service.js";

const mockGetUsers = vi.fn();
const mockGetUserById = vi.fn();
const mockUpdateUser = vi.fn();
const mockPatchUser = vi.fn();
const mockGetOrSet = vi.fn();
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockInvalidateByPrefix = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../infra/supabase/repositories/index.js", () => ({
  getUsers: (...args: unknown[]) => mockGetUsers(...args),
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  patchUser: (...args: unknown[]) => mockPatchUser(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  getOrSet: (...args: unknown[]) => mockGetOrSet(...args),
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
  invalidateByPrefix: (...args: unknown[]) => mockInvalidateByPrefix(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrSet.mockImplementation((_k: string, _ttl: number, fn: () => Promise<unknown>) => fn());
});

describe("listUsers", () => {
  it("delegates to getUsers via getOrSet with hashed filters", async () => {
    const list = { data: [{ id: "u1" }], count: 1 };
    mockGetUsers.mockResolvedValue(list);

    const result = await listUsers({
      getAll: false,
      page: 1,
      limit: 10,
      role: "admin",
      allow: true,
      search: "x",
    });

    expect(result).toEqual(list);
    expect(mockGetOrSet).toHaveBeenCalledOnce();
    expect(mockGetUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      role: "admin",
      allow: true,
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
    const updated = { id: "u1", allow: false };
    mockPatchUser.mockResolvedValue(updated);

    const result = await patchAdminUser("u1", { allow: false });

    expect(result).toEqual(updated);
    expect(mockPatchUser).toHaveBeenCalledWith("u1", { allow: false });
    expect(mockInvalidateByPrefix).toHaveBeenCalledWith("admin:users:");
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });
});
