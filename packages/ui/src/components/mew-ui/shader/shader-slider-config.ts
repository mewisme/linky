import type { ShaderRenderMap, ShaderType } from './types';
import type {
  GemSmokePresetType,
  GodRaysPresetType,
  HeatmapPresetType,
  LiquidMetalPresetType,
  MeshGradientPresetType,
  NeuroNoisePresetType,
  PerlinNoisePresetType,
  SpiralPresetType,
  SwirlPresetType,
  WarpPresetType,
} from './types';
import {
  gemSmokePresets,
  godRaysPresets,
  heatmapPresets,
  liquidMetalPresets,
  meshGradientPresets,
  neuroNoisePresets,
  perlinNoisePresets,
  spiralPresets,
  swirlPresets,
  warpPresets,
} from './presets';

type NumericKeys<T> = {
  [K in keyof T]-?: T[K] extends number | undefined ? K : never;
}[keyof T];

export type ShaderSliderField<T extends ShaderType> = {
  key: NumericKeys<ShaderRenderMap[T]> & string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
};

export type ShaderSliderConfigMap = {
  [K in ShaderType]: readonly ShaderSliderField<K>[];
};

export const shaderSliderConfigMap: ShaderSliderConfigMap = {
  'liquid-metal': [
    { key: 'repetition', min: 1, max: 10, step: 0.1, defaultValue: 4 },
    { key: 'softness', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'shiftRed', min: -1, max: 1, step: 0.01, defaultValue: 0.3 },
    { key: 'shiftBlue', min: -1, max: 1, step: 0.01, defaultValue: 0.3 },
    { key: 'distortion', min: 0, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'contour', min: 0, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'angle', min: 0, max: 360, step: 1, defaultValue: 45 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.6 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 1 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0.1 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: -0.1 },
  ],
  'gem-smoke': [],
  heatmap: [],
  'mesh-gradient': [
    { key: 'distortion', min: 0, max: 1, step: 0.01, defaultValue: 0.35 },
    { key: 'swirl', min: 0, max: 1, step: 0.01, defaultValue: 0.2 },
    { key: 'grainMixer', min: 0, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'grainOverlay', min: 0, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 2 },
    { key: 'rotation', min: 0, max: 360, step: 1, defaultValue: 0 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'originX', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'originY', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
  ],
  warp: [
    { key: 'proportion', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'softness', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'distortion', min: 0, max: 1, step: 0.01, defaultValue: 0.35 },
    { key: 'swirl', min: 0, max: 1, step: 0.01, defaultValue: 0.25 },
    { key: 'swirlIterations', min: 0, max: 20, step: 1, defaultValue: 8 },
    { key: 'shapeScale', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 2 },
    { key: 'rotation', min: 0, max: 360, step: 1, defaultValue: 0 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'originX', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'originY', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
  ],
  spiral: [
    { key: 'density', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'distortion', min: 0, max: 1, step: 0.01, defaultValue: 0.2 },
    { key: 'strokeWidth', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'strokeTaper', min: 0, max: 1, step: 0.01, defaultValue: 0.35 },
    { key: 'strokeCap', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'noise', min: 0, max: 1, step: 0.01, defaultValue: 0.2 },
    { key: 'noiseFrequency', min: 0, max: 1, step: 0.01, defaultValue: 0.3 },
    { key: 'softness', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 0.5 },
    { key: 'rotation', min: 0, max: 360, step: 1, defaultValue: 0 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'originX', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'originY', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
  ],
  swirl: [
    { key: 'bandCount', min: 0, max: 15, step: 1, defaultValue: 6 },
    { key: 'twist', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'center', min: 0, max: 1, step: 0.01, defaultValue: 0.35 },
    { key: 'proportion', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'softness', min: 0, max: 1, step: 0.01, defaultValue: 0.45 },
    { key: 'noise', min: 0, max: 1, step: 0.01, defaultValue: 0.2 },
    { key: 'noiseFrequency', min: 0, max: 1, step: 0.01, defaultValue: 0.25 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 1 },
    { key: 'rotation', min: 0, max: 360, step: 1, defaultValue: 0 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'originX', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'originY', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
  ],
  'neuro-noise': [
    { key: 'brightness', min: 0, max: 1, step: 0.01, defaultValue: 0.45 },
    { key: 'contrast', min: 0, max: 1, step: 0.01, defaultValue: 0.55 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 1 },
    { key: 'rotation', min: 0, max: 360, step: 1, defaultValue: 0 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'originX', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'originY', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
  ],
  'perlin-noise': [
    { key: 'proportion', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'softness', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'octaveCount', min: 1, max: 8, step: 1, defaultValue: 4 },
    { key: 'persistence', min: 0.3, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'lacunarity', min: 1.5, max: 10, step: 0.1, defaultValue: 2 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 1 },
    { key: 'rotation', min: 0, max: 360, step: 1, defaultValue: 0 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'originX', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'originY', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
  ],
  'god-rays': [
    { key: 'bloom', min: 0, max: 1, step: 0.01, defaultValue: 0.35 },
    { key: 'intensity', min: 0, max: 1, step: 0.01, defaultValue: 0.6 },
    { key: 'density', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'spotty', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'midSize', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'midIntensity', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'speed', min: 0, max: 1, step: 0.01, defaultValue: 0.4 },
    { key: 'scale', min: 0.01, max: 4, step: 0.01, defaultValue: 1 },
    { key: 'rotation', min: 0, max: 360, step: 1, defaultValue: 0 },
    { key: 'offsetX', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'offsetY', min: -1, max: 1, step: 0.01, defaultValue: 0 },
    { key: 'originX', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    { key: 'originY', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
  ],
};

export function getShaderSliderFields<T extends ShaderType>(type: T) {
  return shaderSliderConfigMap[type];
}

export function getShaderSliderValue<T extends ShaderType>(
  type: T,
  preset: string | undefined,
  key: string,
  value: Record<string, unknown> | undefined
) {
  const presetValue = getShaderPresetValue(type, preset, key);
  if (typeof presetValue === 'number') {
    if (typeof value?.[key] === 'number') {
      return value[key] as number;
    }
    return presetValue;
  }

  const field = shaderSliderConfigMap[type].find((item) => item.key === key) as ShaderSliderField<T> | undefined;
  const currentValue = value?.[key];
  if (typeof currentValue === 'number') {
    return currentValue;
  }
  return field?.defaultValue ?? 0;
}

function getShaderPresetValue(
  type: ShaderType,
  preset: string | undefined,
  key: string
) {
  if (type === 'liquid-metal') {
    return liquidMetalPresets[(preset ?? 'default') as LiquidMetalPresetType]?.[
      key as keyof ShaderRenderMap['liquid-metal']
    ];
  }

  if (type === 'gem-smoke') {
    return gemSmokePresets[(preset ?? 'default') as GemSmokePresetType]?.[
      key as keyof ShaderRenderMap['gem-smoke']
    ];
  }

  if (type === 'heatmap') {
    return heatmapPresets[(preset ?? 'default') as HeatmapPresetType]?.[
      key as keyof ShaderRenderMap['heatmap']
    ];
  }

  if (type === 'mesh-gradient') {
    return meshGradientPresets[(preset ?? 'default') as MeshGradientPresetType]?.[
      key as keyof ShaderRenderMap['mesh-gradient']
    ];
  }

  if (type === 'warp') {
    return warpPresets[(preset ?? 'default') as WarpPresetType]?.[
      key as keyof ShaderRenderMap['warp']
    ];
  }

  if (type === 'spiral') {
    return spiralPresets[(preset ?? 'default') as SpiralPresetType]?.[
      key as keyof ShaderRenderMap['spiral']
    ];
  }

  if (type === 'swirl') {
    return swirlPresets[(preset ?? 'default') as SwirlPresetType]?.[
      key as keyof ShaderRenderMap['swirl']
    ];
  }

  if (type === 'neuro-noise') {
    return neuroNoisePresets[(preset ?? 'default') as NeuroNoisePresetType]?.[
      key as keyof ShaderRenderMap['neuro-noise']
    ];
  }

  if (type === 'perlin-noise') {
    return perlinNoisePresets[(preset ?? 'default') as PerlinNoisePresetType]?.[
      key as keyof ShaderRenderMap['perlin-noise']
    ];
  }

  return godRaysPresets[(preset ?? 'default') as GodRaysPresetType]?.[
    key as keyof ShaderRenderMap['god-rays']
  ];
}
