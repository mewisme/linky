import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  putUserSettings,
  patchUserSettingsForUser,
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
    const created = { user_id: "u1", default_mute_mic: true };
    mockCreateUserSettings.mockResolvedValue(created);

    const result = await putUserSettings("u1", { default_mute_mic: true });

    expect(result).toEqual(created);
    expect(mockCreateUserSettings).toHaveBeenCalledWith("u1", { default_mute_mic: true });
    expect(mockUpdateUserSettings).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });

  it("when existing: updates and invalidates", async () => {
    mockGetUserSettingsByUserId.mockResolvedValue({ user_id: "u1" });
    const updated = { user_id: "u1", default_mute_mic: false };
    mockUpdateUserSettings.mockResolvedValue(updated);

    const result = await putUserSettings("u1", { default_mute_mic: false });

    expect(result).toEqual(updated);
    expect(mockUpdateUserSettings).toHaveBeenCalledWith("u1", { default_mute_mic: false });
    expect(mockCreateUserSettings).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });
});

describe("patchUserSettingsForUser", () => {
  it("when no existing: creates and invalidates", async () => {
    mockGetUserSettingsByUserId.mockResolvedValue(null);
    mockCreateUserSettings.mockResolvedValue({ user_id: "u1" });

    await patchUserSettingsForUser("u1", { notification_sound_enabled: false });

    expect(mockCreateUserSettings).toHaveBeenCalledWith("u1", { notification_sound_enabled: false });
    expect(mockPatchUserSettings).not.toHaveBeenCalled();
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });

  it("when existing: patches and invalidates", async () => {
    mockGetUserSettingsByUserId.mockResolvedValue({ user_id: "u1" });
    mockPatchUserSettings.mockResolvedValue({ user_id: "u1", default_disable_camera: true });

    await patchUserSettingsForUser("u1", { default_disable_camera: true });

    expect(mockPatchUserSettings).toHaveBeenCalledWith("u1", { default_disable_camera: true });
    expect(mockInvalidate).toHaveBeenCalledWith("user:profile:u1");
  });
});
