import * as Sentry from "@sentry/nextjs";

import type { StreamVideoQuality } from "@/entities/user/lib/user-settings-preferences";
import { getStreamVideoQualityProfile } from "./stream-video-quality";

export type QualityTier = "high" | "medium" | "low" | "minimal";

export interface EncodingProfile {
  maxBitrate: number;
  maxFramerate: number;
  scaleResolutionDownBy: number;
}

export interface DeviceProfile {
  high: EncodingProfile;
  medium: EncodingProfile;
  low: EncodingProfile;
  minimal: EncodingProfile;
}

const DESKTOP_PROFILE: DeviceProfile = {
  high: {
    maxBitrate: 2_500_000,
    maxFramerate: 30,
    scaleResolutionDownBy: 1,
  },
  medium: {
    maxBitrate: 1_500_000,
    maxFramerate: 24,
    scaleResolutionDownBy: 1.5,
  },
  low: {
    maxBitrate: 900_000,
    maxFramerate: 20,
    scaleResolutionDownBy: 2,
  },
  minimal: {
    maxBitrate: 500_000,
    maxFramerate: 15,
    scaleResolutionDownBy: 3,
  },
};

const MOBILE_PROFILE: DeviceProfile = {
  high: {
    maxBitrate: 1_500_000,
    maxFramerate: 24,
    scaleResolutionDownBy: 1,
  },
  medium: {
    maxBitrate: 900_000,
    maxFramerate: 20,
    scaleResolutionDownBy: 1.5,
  },
  low: {
    maxBitrate: 500_000,
    maxFramerate: 18,
    scaleResolutionDownBy: 2,
  },
  minimal: {
    maxBitrate: 300_000,
    maxFramerate: 12,
    scaleResolutionDownBy: 3,
  },
};

export function getDeviceProfile(isMobile: boolean): DeviceProfile {
  return isMobile ? MOBILE_PROFILE : DESKTOP_PROFILE;
}

export function getInitialEncodingParams(isMobile: boolean): EncodingProfile {
  const profile = getDeviceProfile(isMobile);
  return profile.high;
}

export function getEncodingParamsForTier(
  tier: QualityTier,
  isMobile: boolean,
): EncodingProfile {
  const profile = getDeviceProfile(isMobile);
  return profile[tier];
}

export function getEncodingParamsForStreamQuality(
  quality: StreamVideoQuality,
): EncodingProfile {
  const target = getStreamVideoQualityProfile(quality);
  return {
    maxBitrate: target.maxBitrate,
    maxFramerate: target.maxFramerate,
    scaleResolutionDownBy: 1,
  };
}

export async function applyEncodingToSender(
  sender: RTCRtpSender,
  params: EncodingProfile,
): Promise<boolean> {
  try {
    const currentParams = sender.getParameters();

    if (!currentParams.encodings || currentParams.encodings.length === 0) {
      Sentry.logger.warn("No encodings found in sender parameters");
      return false;
    }

    currentParams.encodings[0]!.maxBitrate = params.maxBitrate;
    currentParams.encodings[0]!.maxFramerate = params.maxFramerate;
    currentParams.encodings[0]!.scaleResolutionDownBy =
      params.scaleResolutionDownBy;

    await sender.setParameters(currentParams);
    Sentry.logger.info("Applied encoding parameters", { params });
    return true;
  } catch (err) {
    Sentry.logger.error("Failed to apply encoding parameters", { error: err });
    return false;
  }
}

export function degradeQuality(currentTier: QualityTier): QualityTier {
  const tierOrder: QualityTier[] = ["high", "medium", "low", "minimal"];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return currentTier;
  }

  return tierOrder[currentIndex + 1]!;
}

export function restoreQuality(currentTier: QualityTier): QualityTier {
  const tierOrder: QualityTier[] = ["high", "medium", "low", "minimal"];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex === 0) {
    return currentTier;
  }

  return tierOrder[currentIndex - 1]!;
}

export async function applyInitialEncoding(
  pc: RTCPeerConnection,
  _isMobile: boolean,
  quality: StreamVideoQuality = "sd",
): Promise<void> {
  const params = getEncodingParamsForStreamQuality(quality);
  const senders = pc.getSenders();

  for (const sender of senders) {
    if (sender.track?.kind === "video") {
      await applyEncodingToSender(sender, params);
    }
  }
}
