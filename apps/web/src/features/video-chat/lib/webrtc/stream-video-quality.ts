import type { StreamVideoQuality } from "@/entities/user/lib/user-settings-preferences";

export interface StreamVideoQualityProfile {
  width: number;
  height: number;
  maxBitrate: number;
  minBitrate?: number;
  maxFramerate: number;
}

const QUALITY_PROFILES: Record<StreamVideoQuality, StreamVideoQualityProfile> =
  {
    sd: {
      width: 640,
      height: 360,
      maxBitrate: 900_000,
      minBitrate: 500_000,
      maxFramerate: 24,
    },
    hd: {
      width: 1280,
      height: 720,
      maxBitrate: 2_500_000,
      minBitrate: 1_500_000,
      maxFramerate: 30,
    },
  };

export function getStreamVideoQualityProfile(
  quality: StreamVideoQuality,
): StreamVideoQualityProfile {
  return QUALITY_PROFILES[quality];
}

export function getCaptureConstraintsForQuality(
  quality: StreamVideoQuality,
): MediaTrackConstraints {
  const profile = QUALITY_PROFILES[quality];
  return {
    width: { ideal: profile.width },
    height: { ideal: profile.height },
    frameRate: { ideal: profile.maxFramerate },
  };
}
