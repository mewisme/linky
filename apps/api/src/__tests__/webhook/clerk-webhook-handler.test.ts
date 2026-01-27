import type { ClerkUserCreatedEvent, ClerkUserDeletedEvent } from "../../types/webhook/webhook.types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleClerkWebhookEvent } from "../../webhook/clerk-webhook-handler.js";

const mockCreateUser = vi.fn();
const mockGetUserByEmail = vi.fn();
const mockGetUserByClerkId = vi.fn();
const mockPatchUser = vi.fn();
const mockSoftDeleteUserByClerkId = vi.fn();
const mockInvalidateByPrefix = vi.fn().mockResolvedValue(undefined);

vi.mock("../../infra/supabase/repositories/index.js", () => ({
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  getUserByEmail: (...args: unknown[]) => mockGetUserByEmail(...args),
  getUserByClerkId: (...args: unknown[]) => mockGetUserByClerkId(...args),
  patchUser: (...args: unknown[]) => mockPatchUser(...args),
  softDeleteUserByClerkId: (...args: unknown[]) => mockSoftDeleteUserByClerkId(...args),
}));

vi.mock("../../infra/redis/cache/index.js", () => ({
  invalidateByPrefix: (...args: unknown[]) => mockInvalidateByPrefix(...args),
}));

vi.mock("../../infra/redis/cache/keys.js", () => ({
  REDIS_CACHE_KEYS: { adminPrefix: (r: string) => `admin:${r}:` },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function userDeletedEvent(clerkId: string): ClerkUserDeletedEvent {
  return {
    type: "user.deleted",
    data: { id: clerkId, deleted: true, object: "user" },
    object: "event",
    instance_id: "inst",
    timestamp: Date.now() / 1000,
    event_attributes: { http_request: { client_ip: "1.2.3.4", user_agent: "test" } },
  };
}

function userCreatedEvent(opts: {
  clerkId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}): ClerkUserCreatedEvent {
  const data = {
    id: opts.clerkId,
    email_addresses: opts.email
      ? [{ email_address: opts.email, id: "ea1", verification: null, linked_to: [], created_at: 0, updated_at: 0 }]
      : [],
    first_name: opts.firstName ?? "",
    last_name: opts.lastName ?? "",
    image_url: opts.imageUrl ?? "",
    object: "user" as const,
    backup_code_enabled: false,
    banned: false,
    create_organization_enabled: true,
    create_organizations_limit: null,
    created_at: 0,
    delete_self_enabled: true,
    enterprise_accounts: [],
    external_accounts: [],
    external_id: null,
    has_image: false,
    last_active_at: 0,
    last_sign_in_at: 0,
    legal_accepted_at: 0,
    locked: false,
    lockout_expires_in_seconds: null,
    mfa_disabled_at: null,
    mfa_enabled_at: null,
    passkeys: [],
    password_enabled: false,
    phone_numbers: [],
    primary_email_address_id: "ea1",
    primary_phone_number_id: null,
    primary_web3_wallet_id: null,
    private_metadata: null,
    profile_image_url: "",
    public_metadata: {},
    saml_accounts: [],
    totp_enabled: false,
    two_factor_enabled: false,
    unsafe_metadata: {},
    updated_at: 0,
    username: null,
    verification_attempts_remaining: null,
    web3_wallets: [],
  };
  return {
    type: "user.created",
    data,
    object: "event",
    instance_id: "inst",
    timestamp: Date.now() / 1000,
    event_attributes: { http_request: { client_ip: "1.2.3.4", user_agent: "test" } },
  };
}

describe("handleClerkWebhookEvent", () => {
  describe("user.deleted", () => {
    it("sets deleted = true via softDeleteUserByClerkId and invalidates admin users cache", async () => {
      await handleClerkWebhookEvent(userDeletedEvent("clerk_xyz"));

      expect(mockSoftDeleteUserByClerkId).toHaveBeenCalledWith("clerk_xyz");
      expect(mockInvalidateByPrefix).toHaveBeenCalledWith("admin:users:");
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(mockPatchUser).not.toHaveBeenCalled();
    });

    it("is idempotent: multiple user.deleted for same id still call soft-delete and invalidate", async () => {
      const evt = userDeletedEvent("clerk_dup");
      await handleClerkWebhookEvent(evt);
      await handleClerkWebhookEvent(evt);

      expect(mockSoftDeleteUserByClerkId).toHaveBeenCalledTimes(2);
      expect(mockInvalidateByPrefix).toHaveBeenCalledTimes(2);
    });
  });

  describe("user.created", () => {
    it("restores deleted user when email matches", async () => {
      const existing = { id: "db-u1", email: "a@b.com", clerk_user_id: "old_clerk", deleted: true };
      mockGetUserByEmail.mockResolvedValue(existing);
      mockPatchUser.mockResolvedValue({ ...existing, deleted: false });

      await handleClerkWebhookEvent(
        userCreatedEvent({ clerkId: "new_clerk", email: "a@b.com", firstName: "A", lastName: "B" }),
      );

      expect(mockGetUserByEmail).toHaveBeenCalledWith("a@b.com");
      expect(mockPatchUser).toHaveBeenCalledWith(
        "db-u1",
        expect.objectContaining({
          clerk_user_id: "new_clerk",
          email: "a@b.com",
          first_name: "A",
          last_name: "B",
          deleted: false,
          deleted_at: null,
        }),
      );
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("creates new user when email does not exist", async () => {
      mockGetUserByEmail.mockResolvedValue(null);

      await handleClerkWebhookEvent(
        userCreatedEvent({ clerkId: "clerk_new", email: "new@b.com", firstName: "N", lastName: "E" }),
      );

      expect(mockGetUserByEmail).toHaveBeenCalledWith("new@b.com");
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: "clerk_new",
          email: "new@b.com",
          first_name: "N",
          last_name: "E",
        }),
      );
      expect(mockPatchUser).not.toHaveBeenCalled();
    });

    it("creates new user when no email in event", async () => {
      mockGetUserByEmail.mockResolvedValue(null);

      await handleClerkWebhookEvent(
        userCreatedEvent({ clerkId: "clerk_no_email" }),
      );

      expect(mockGetUserByEmail).not.toHaveBeenCalled();
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: "clerk_no_email",
          email: null,
          first_name: "",
          last_name: "",
        }),
      );
    });

    it("normalizes email to lowercase when checking for existing user", async () => {
      const existing = { id: "db-u1", email: "test@example.com", clerk_user_id: "old_clerk", deleted: true };
      mockGetUserByEmail.mockResolvedValue(existing);
      mockPatchUser.mockResolvedValue({ ...existing, deleted: false });

      await handleClerkWebhookEvent(
        userCreatedEvent({ clerkId: "new_clerk", email: "TEST@EXAMPLE.COM", firstName: "T", lastName: "E" }),
      );

      expect(mockGetUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockPatchUser).toHaveBeenCalledWith(
        "db-u1",
        expect.objectContaining({
          clerk_user_id: "new_clerk",
          email: "test@example.com",
          deleted: false,
          deleted_at: null,
        }),
      );
    });

    it("updates clerk_user_id when non-deleted user has mismatched clerk_user_id", async () => {
      const existing = { id: "db-u1", email: "a@b.com", clerk_user_id: "old_clerk", deleted: false };
      mockGetUserByEmail.mockResolvedValue(existing);
      mockPatchUser.mockResolvedValue({ ...existing, clerk_user_id: "new_clerk" });

      await handleClerkWebhookEvent(
        userCreatedEvent({ clerkId: "new_clerk", email: "a@b.com", firstName: "A", lastName: "B" }),
      );

      expect(mockGetUserByEmail).toHaveBeenCalledWith("a@b.com");
      expect(mockPatchUser).toHaveBeenCalledWith(
        "db-u1",
        expect.objectContaining({
          clerk_user_id: "new_clerk",
          email: "a@b.com",
          first_name: "A",
          last_name: "B",
        }),
      );
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("does not update when non-deleted user has matching clerk_user_id (idempotent)", async () => {
      const existing = { id: "db-u1", email: "a@b.com", clerk_user_id: "same_clerk", deleted: false };
      mockGetUserByEmail.mockResolvedValue(existing);

      await handleClerkWebhookEvent(
        userCreatedEvent({ clerkId: "same_clerk", email: "a@b.com", firstName: "A", lastName: "B" }),
      );

      expect(mockGetUserByEmail).toHaveBeenCalledWith("a@b.com");
      expect(mockPatchUser).not.toHaveBeenCalled();
      expect(mockCreateUser).not.toHaveBeenCalled();
    });
  });
});
