import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchUserByClerkUserId,
  tryUpdateUserCountryFromHeader,
  updateUserCountryByClerkUserId,
} from "../../../domains/user/service/user.service.js";

let mockSelectSingle: { data: unknown; error: { message: string } | null } = { data: null, error: null };
let mockUpdateOnly: { error: { message: string } | null } = { error: null };
let mockUpdateSelectSingle: { data: unknown; error: { message: string } | null } = { data: null, error: null };
let updateEqReturnsSelectChain = false;

const mockInvalidate = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../infra/supabase/client.js", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(mockSelectSingle),
        }),
      }),
      update: (d: Record<string, unknown>) => ({
        eq: () =>
          updateEqReturnsSelectChain
            ? { select: () => ({ single: () => Promise.resolve(mockUpdateSelectSingle) }) }
            : Promise.resolve(mockUpdateOnly),
      }),
    }),
  },
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectSingle = { data: null, error: null };
  mockUpdateOnly = { error: null };
  mockUpdateSelectSingle = { data: null, error: null };
  updateEqReturnsSelectChain = false;
});

describe("fetchUserByClerkUserId", () => {
  it("returns user and null error when select finds one", async () => {
    const user = { id: "u1", clerk_user_id: "clerk_1" };
    mockSelectSingle = { data: user, error: null };

    const result = await fetchUserByClerkUserId("clerk_1");

    expect(result).toEqual({ user, error: null });
  });

  it("returns null user when select returns no row", async () => {
    mockSelectSingle = { data: null, error: { message: "PGRST116" } };

    const result = await fetchUserByClerkUserId("clerk_x");

    expect(result.user).toBeNull();
    expect(result.error).not.toBeNull();
  });
});

describe("tryUpdateUserCountryFromHeader", () => {
  it("when update fails: returns updatedUser null and updateError", async () => {
    mockUpdateOnly = { error: { message: "db error" } };

    const result = await tryUpdateUserCountryFromHeader("clerk_1", "US");

    expect(result).toEqual({ updatedUser: null, updateError: { message: "db error" } });
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("when update succeeds and select returns user: invalidates user:profile:id and returns updatedUser", async () => {
    mockUpdateOnly = { error: null };
    const updatedUser = { id: "u1", clerk_user_id: "clerk_1", country: "US" };
    mockSelectSingle = { data: updatedUser, error: null };

    const result = await tryUpdateUserCountryFromHeader("clerk_1", "US");

    expect(result).toEqual({ updatedUser, updateError: null });
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });

  it("when update succeeds but select returns null: does not invalidate", async () => {
    mockUpdateOnly = { error: null };
    mockSelectSingle = { data: null, error: null };

    const result = await tryUpdateUserCountryFromHeader("clerk_1", "US");

    expect(result.updatedUser).toBeNull();
    expect(result.updateError).toBeNull();
    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe("updateUserCountryByClerkUserId", () => {
  it("when update().select().single() returns user: invalidates and returns user", async () => {
    updateEqReturnsSelectChain = true;
    const user = { id: "u1", clerk_user_id: "clerk_1", country: "FR" };
    mockUpdateSelectSingle = { data: user, error: null };

    const result = await updateUserCountryByClerkUserId("clerk_1", "FR");

    expect(result).toEqual({ user, error: null });
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });

  it("when update returns error: returns error and does not invalidate", async () => {
    updateEqReturnsSelectChain = true;
    mockUpdateSelectSingle = { data: null, error: { message: "constraint" } };

    const result = await updateUserCountryByClerkUserId("clerk_1", "XX");

    expect(result.user).toBeNull();
    expect(result.error).toEqual({ message: "constraint" });
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("when user has no id: does not invalidate", async () => {
    updateEqReturnsSelectChain = true;
    mockUpdateSelectSingle = { data: { id: null }, error: null };

    await updateUserCountryByClerkUserId("clerk_1", "DE");

    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});
