import type { StreamVideoQuality } from "@/entities/user/lib/user-settings-preferences";

export interface StreamVideoQualityProfile {
  width: number;
  height: number;
  maxBitrate: number;
  minBitrate?: number;
  maxFramerate: number;
}

const QUALITY_PROFILES: Record<Exclude<StreamVideoQuality, "auto">, StreamVideoQualityProfile> = {
  "360p": {
    width: 640,
    height: 360,
    maxBitrate: 900_000,
    minBitrate: 500_000,
    maxFramerate: 24,
  },
  "480p": {
    width: 854,
    height: 480,
    maxBitrate: 1_500_000,
    minBitrate: 900_000,
    maxFramerate: 24,
  },
  "720p": {
    width: 1280,
    height: 720,
    maxBitrate: 2_500_000,
    minBitrate: 1_500_000,
    maxFramerate: 30,
  },
  "1080p": {
    width: 1920,
    height: 1080,
    maxBitrate: 4_500_000,
    minBitrate: 3_000_000,
    maxFramerate: 30,
  },
};

export const PREFERRED_AUTO_QUALITY: Exclude<StreamVideoQuality, "auto"> = "720p";

export function getStreamVideoQualityProfile(
  quality: Exclude<StreamVideoQuality, "auto">
): StreamVideoQualityProfile {
  return QUALITY_PROFILES[quality];
}

export function getCaptureConstraintsForQuality(
  quality: StreamVideoQuality
): MediaTrackConstraints {
  const target = quality === "auto" ? PREFERRED_AUTO_QUALITY : quality;
  const profile = QUALITY_PROFILES[target];
  return {
    width: { ideal: profile.width },
    height: { ideal: profile.height },
    frameRate: { ideal: profile.maxFramerate },
  };
}

export function getStreamQualityBitrateLabelKey(
  quality: StreamVideoQuality
): string {
  if (quality === "auto") return "auto";
  return quality;
}
