import * as Sentry from "@sentry/nextjs";

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
    maxBitrate: 1000000,
    maxFramerate: 24,
    scaleResolutionDownBy: 1,
  },
  medium: {
    maxBitrate: 700000,
    maxFramerate: 20,
    scaleResolutionDownBy: 1.5,
  },
  low: {
    maxBitrate: 500000,
    maxFramerate: 15,
    scaleResolutionDownBy: 2,
  },
  minimal: {
    maxBitrate: 300000,
    maxFramerate: 12,
    scaleResolutionDownBy: 2.5,
  },
};

const MOBILE_PROFILE: DeviceProfile = {
  high: {
    maxBitrate: 600000,
    maxFramerate: 20,
    scaleResolutionDownBy: 1.5,
  },
  medium: {
    maxBitrate: 420000,
    maxFramerate: 18,
    scaleResolutionDownBy: 2,
  },
  low: {
    maxBitrate: 300000,
    maxFramerate: 15,
    scaleResolutionDownBy: 2.5,
  },
  minimal: {
    maxBitrate: 180000,
    maxFramerate: 10,
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
  isMobile: boolean
): EncodingProfile {
  const profile = getDeviceProfile(isMobile);
  return profile[tier];
}

export async function applyEncodingToSender(
  sender: RTCRtpSender,
  params: EncodingProfile
): Promise<boolean> {
  try {
    const currentParams = sender.getParameters();

    if (!currentParams.encodings || currentParams.encodings.length === 0) {
      Sentry.logger.warn("No encodings found in sender parameters");
      return false;
    }

    currentParams.encodings[0]!.maxBitrate = params.maxBitrate;
    currentParams.encodings[0]!.maxFramerate = params.maxFramerate;
    currentParams.encodings[0]!.scaleResolutionDownBy = params.scaleResolutionDownBy;

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
  isMobile: boolean
): Promise<void> {
  const initialParams = getInitialEncodingParams(isMobile);
  const senders = pc.getSenders();

  for (const sender of senders) {
    if (sender.track?.kind === "video") {
      await applyEncodingToSender(sender, initialParams);
    }
  }
}
