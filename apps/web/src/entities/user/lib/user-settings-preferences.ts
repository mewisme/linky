import type {
  GemSmokePresetType,
  LiquidMetalPresetType,
  HeatmapPresetType,
  ShaderType,
  ShaderPresetType,
  ShaderRenderMap,
  MeshGradientPresetType,
  WarpPresetType,
  SpiralPresetType,
  SwirlPresetType,
  NeuroNoisePresetType,
  PerlinNoisePresetType,
  GodRaysPresetType,
} from "@ws/ui/components/mew-ui/shader";
import { shaderTypes } from "@ws/ui/components/mew-ui/shader";
import type { AppLocale } from "@/shared/types/app-locale.types";
import type {
  SidebarCollapsible,
  SidebarVariant,
} from "@/shared/model/sidebar-store";

export type StreamVideoQuality = "sd" | "hd";

export const STREAM_VIDEO_QUALITY_VALUES: readonly StreamVideoQuality[] = [
  "sd",
  "hd",
] as const;

const LEGACY_HD_QUALITIES = new Set(["720p", "1080p"]);

export function normalizeStreamVideoQuality(
  value: unknown,
): StreamVideoQuality {
  if (value === "sd" || value === "hd") {
    return value;
  }
  if (typeof value === "string" && LEGACY_HD_QUALITIES.has(value)) {
    return "hd";
  }
  return "sd";
}

export type UserCallPreferences = {
  default_mute_mic: boolean;
  default_disable_camera: boolean;
  quality: StreamVideoQuality;
};

export type UserNotificationPreferences = {
  sound_enabled: boolean;
  preferences: Record<string, unknown>;
};

export type UserShaderPreferences = {
  type: ShaderType;
  preset: ShaderPresetType;
  disabled: boolean;
  props?: ShaderRenderMap[ShaderType];
};

export type UserSidebarPreferences = {
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
};

const defaultCallPreferences: UserCallPreferences = {
  default_mute_mic: false,
  default_disable_camera: false,
  quality: "sd",
};

const defaultNotificationPreferences: UserNotificationPreferences = {
  sound_enabled: true,
  preferences: {},
};

const defaultShaderPreferences: UserShaderPreferences = {
  type: "liquid-metal",
  preset: "default",
  disabled: false,
  props: undefined,
};

const defaultSidebarPreferences: UserSidebarPreferences = {
  variant: "sidebar",
  collapsible: "offcanvas",
};

const shaderPresetsByType: Record<ShaderType, ReadonlySet<ShaderPresetType>> = {
  "gem-smoke": new Set(
    Object.keys(shaderTypes.gemSmoke.presets) as GemSmokePresetType[],
  ),
  "liquid-metal": new Set(
    Object.keys(shaderTypes.liquidMetal.presets) as LiquidMetalPresetType[],
  ),
  heatmap: new Set(
    Object.keys(shaderTypes.heatmap.presets) as HeatmapPresetType[],
  ),
  "mesh-gradient": new Set(
    Object.keys(shaderTypes.meshGradient.presets) as MeshGradientPresetType[],
  ),
  warp: new Set(Object.keys(shaderTypes.warp.presets) as WarpPresetType[]),
  spiral: new Set(
    Object.keys(shaderTypes.spiral.presets) as SpiralPresetType[],
  ),
  swirl: new Set(Object.keys(shaderTypes.swirl.presets) as SwirlPresetType[]),
  "neuro-noise": new Set(
    Object.keys(shaderTypes.neuroNoise.presets) as NeuroNoisePresetType[],
  ),
  "perlin-noise": new Set(
    Object.keys(shaderTypes.perlinNoise.presets) as PerlinNoisePresetType[],
  ),
  "god-rays": new Set(
    Object.keys(shaderTypes.godRays.presets) as GodRaysPresetType[],
  ),
};

export function getDefaultShaderPreferences(): UserShaderPreferences {
  return defaultShaderPreferences;
}

export function getDefaultSidebarPreferences(): UserSidebarPreferences {
  return defaultSidebarPreferences;
}

export function getDefaultCallPreferences(): UserCallPreferences {
  return defaultCallPreferences;
}

export function getDefaultNotificationPreferences(): UserNotificationPreferences {
  return defaultNotificationPreferences;
}

export function isStreamVideoQuality(
  value: unknown,
): value is StreamVideoQuality {
  return (
    typeof value === "string" &&
    (STREAM_VIDEO_QUALITY_VALUES as readonly string[]).includes(value)
  );
}

export function normalizeUserCallPreferences(
  value: unknown,
): UserCallPreferences {
  if (!value || typeof value !== "object") {
    return defaultCallPreferences;
  }

  const candidate = value as Record<string, unknown>;
  return {
    default_mute_mic: candidate.default_mute_mic === true,
    default_disable_camera: candidate.default_disable_camera === true,
    quality: normalizeStreamVideoQuality(candidate.quality),
  };
}

export function normalizeUserNotificationPreferences(
  value: unknown,
): UserNotificationPreferences {
  if (!value || typeof value !== "object") {
    return defaultNotificationPreferences;
  }

  const candidate = value as Record<string, unknown>;
  const sound_enabled =
    candidate.sound_enabled === undefined
      ? defaultNotificationPreferences.sound_enabled
      : candidate.sound_enabled === true;
  const preferences =
    candidate.preferences && typeof candidate.preferences === "object"
      ? (candidate.preferences as Record<string, unknown>)
      : defaultNotificationPreferences.preferences;

  return { sound_enabled, preferences };
}

export function getShaderPresets(type: ShaderType): ShaderPresetType[] {
  return Array.from(shaderPresetsByType[type]);
}

export function normalizeUserShaderPreferences(
  value: unknown,
): UserShaderPreferences {
  if (!value || typeof value !== "object") {
    return defaultShaderPreferences;
  }

  const candidate = value as Record<string, unknown>;
  const type =
    candidate.type === "liquid-metal" ||
    candidate.type === "gem-smoke" ||
    candidate.type === "heatmap" ||
    candidate.type === "mesh-gradient" ||
    candidate.type === "warp" ||
    candidate.type === "spiral" ||
    candidate.type === "swirl" ||
    candidate.type === "neuro-noise" ||
    candidate.type === "perlin-noise" ||
    candidate.type === "god-rays"
      ? candidate.type
      : defaultShaderPreferences.type;
  const presetCandidate =
    typeof candidate.preset === "string"
      ? (candidate.preset as ShaderPresetType)
      : defaultShaderPreferences.preset;
  const preset = shaderPresetsByType[type].has(presetCandidate)
    ? presetCandidate
    : defaultShaderPreferences.preset;
  const disabled = candidate.disabled === true;
  const shaderProps =
    candidate.props && typeof candidate.props === "object"
      ? (candidate.props as ShaderRenderMap[ShaderType])
      : undefined;

  return { type, preset, disabled, props: shaderProps };
}

export function normalizeUserSidebarPreferences(
  value: unknown,
): UserSidebarPreferences {
  if (!value || typeof value !== "object") {
    return defaultSidebarPreferences;
  }

  const candidate = value as Record<string, unknown>;
  const variant: SidebarVariant =
    candidate.variant === "floating" ? "floating" : "sidebar";
  const collapsible: SidebarCollapsible =
    candidate.collapsible === "icon" ? "icon" : "offcanvas";

  return { variant, collapsible };
}

export function normalizeUserLanguage(value: unknown): AppLocale | null {
  if (value === "en" || value === "vi") {
    return value;
  }
  return null;
}
