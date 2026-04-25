import type {
  GemSmokePresetType,
  LiquidMetalPresetType,
  HeatmapPresetType,
  ShaderType,
  ShaderPresetType,
  MeshGradientPresetType,
  WarpPresetType,
  SpiralPresetType,
  SwirlPresetType,
  NeuroNoisePresetType,
  PerlinNoisePresetType,
  GodRaysPresetType,
} from "@ws/ui/components/mew-ui/shader";
import { shaderTypes } from "@ws/ui/components/mew-ui/shader";
import type { UiLocale } from "@ws/shared-types";
import type { SidebarCollapsible, SidebarVariant } from "@/shared/model/sidebar-store";

export type UserShaderPreferences = {
  type: ShaderType;
  preset: ShaderPresetType;
  disableAnimation: boolean;
};

export type UserSidebarPreferences = {
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
};

const defaultShaderPreferences: UserShaderPreferences = {
  type: "liquid-metal",
  preset: "default",
  disableAnimation: false,
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
  "heatmap": new Set(
    Object.keys(shaderTypes.heatmap.presets) as HeatmapPresetType[],
  ),
  "mesh-gradient": new Set(
    Object.keys(shaderTypes.meshGradient.presets) as MeshGradientPresetType[],
  ),
  warp: new Set(
    Object.keys(shaderTypes.warp.presets) as WarpPresetType[],
  ),
  spiral: new Set(
    Object.keys(shaderTypes.spiral.presets) as SpiralPresetType[],
  ),
  swirl: new Set(
    Object.keys(shaderTypes.swirl.presets) as SwirlPresetType[],
  ),
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

export function getShaderPresets(type: ShaderType): ShaderPresetType[] {
  return Array.from(shaderPresetsByType[type]);
}

export function normalizeUserShaderPreferences(value: unknown): UserShaderPreferences {
  if (!value || typeof value !== "object") {
    return defaultShaderPreferences;
  }

  const candidate = value as Record<string, unknown>;
  const type = candidate.type === "liquid-metal"
    || candidate.type === "gem-smoke"
    || candidate.type === "heatmap"
    || candidate.type === "mesh-gradient"
    || candidate.type === "warp"
    || candidate.type === "spiral"
    || candidate.type === "swirl"
    || candidate.type === "neuro-noise"
    || candidate.type === "perlin-noise"
    || candidate.type === "god-rays"
    ? candidate.type
    : defaultShaderPreferences.type;
  const presetCandidate = typeof candidate.preset === "string"
    ? candidate.preset as ShaderPresetType
    : defaultShaderPreferences.preset;
  const preset = shaderPresetsByType[type].has(presetCandidate) ? presetCandidate : defaultShaderPreferences.preset;
  const disableAnimation = candidate.disableAnimation === true;

  return { type, preset, disableAnimation };
}

export function normalizeUserSidebarPreferences(value: unknown): UserSidebarPreferences {
  if (!value || typeof value !== "object") {
    return defaultSidebarPreferences;
  }

  const candidate = value as Record<string, unknown>;
  const variant: SidebarVariant = candidate.variant === "floating" ? "floating" : "sidebar";
  const collapsible: SidebarCollapsible = candidate.collapsible === "icon" ? "icon" : "offcanvas";

  return { variant, collapsible };
}

export function normalizeUserLanguage(value: unknown): UiLocale | null {
  if (value === "en" || value === "vi") {
    return value;
  }
  return null;
}
