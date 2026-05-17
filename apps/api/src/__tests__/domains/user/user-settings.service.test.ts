import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  patchUserSettingsForUser,
  putUserSettings,
} from "../../../domains/user/service/user-settings.service.js";

const mockGetUserSettingsByUserId = vi.fn();
const mockCreateUserSettings = vi.fn();
const mockUpdateUserSettings = vi.fn();
const mockPatchUserSettings = vi.fn();
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../infra/supabase/repositories/user-settings.js", () => ({
  getUserSettingsByUserId: (...args: unknown[]) => mockGetUserSettingsByUserId(...args),
  createUserSettings: (...args: unknown[]) => mockCreateUserSettings(...args),
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
  patchUserSettings: (...args: unknown[]) => mockPatchUserSettings(...args),
}));

vi.mock("../../../infra/redis/cache/index.js", () => ({
  invalidate: (...args: unknown[]) => mockInvalidate(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("putUserSettings", () => {
  it("when no existing: creates and invalidates user:profile:userId", async () => {
    mockGetUserSettingsByUserId.mockResolvedValue(null);
    const callPayload = { default_mute_mic: true, default_disable_camera: false, quality: "auto" as const };
    const created = { user_id: "u1", call: callPayload };
    mockCreateUserSettings.mockResolvedValue(created);

    const result = await putUserSettings("u1", { call: callPayload });

    expect(result).toEqual(created);
    expect(mockCreateUserSettings).toHaveBeenCalledWith("u1", { call: callPayload });
    expect(mockUpdateUserSettings).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });

  it("when existing: updates and invalidates", async () => {
    mockGetUserSettingsByUserId.mockResolvedValue({ user_id: "u1" });
    const callPayload = { default_mute_mic: false, default_disable_camera: false, quality: "720p" as const };
    const updated = { user_id: "u1", call: callPayload };
    mockUpdateUserSettings.mockResolvedValue(updated);

    const result = await putUserSettings("u1", { call: callPayload });

    expect(result).toEqual(updated);
    expect(mockUpdateUserSettings).toHaveBeenCalledWith("u1", { call: callPayload });
    expect(mockCreateUserSettings).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });
});

describe("patchUserSettingsForUser", () => {
  it("when no existing: creates and invalidates", async () => {
    mockGetUserSettingsByUserId.mockResolvedValue(null);
    mockCreateUserSettings.mockResolvedValue({ user_id: "u1" });

    const notificationPatch = { notification: { sound_enabled: false } };
    await patchUserSettingsForUser("u1", notificationPatch);

    expect(mockCreateUserSettings).toHaveBeenCalledWith("u1", notificationPatch);
    expect(mockPatchUserSettings).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });

  it("when existing: patches and invalidates", async () => {
    mockGetUserSettingsByUserId.mockResolvedValue({ user_id: "u1" });
    const callPatch = { call: { default_disable_camera: true } };
    mockPatchUserSettings.mockResolvedValue({ user_id: "u1", call: callPatch.call });

    await patchUserSettingsForUser("u1", callPatch);

    expect(mockPatchUserSettings).toHaveBeenCalledWith("u1", callPatch);
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });
});
