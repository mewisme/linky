import { ShaderPreset } from "./types";
import {
  liquidMetalPresets as liquidMetalPresetsData,
  gemSmokePresets as gemSmokePresetsData,
  heatmapPresets as heatmapPresetsData,
  meshGradientPresets as meshGradientPresetsData,
  warpPresets as warpPresetsData,
  spiralPresets as spiralPresetsData,
  swirlPresets as swirlPresetsData,
  neuroNoisePresets as neuroNoisePresetsData,
  perlinNoisePresets as perlinNoisePresetsData,
  godRaysPresets as godRaysPresetsData,
} from "@paper-design/shaders-react";

export const liquidMetalPresets: ShaderPreset<'liquid-metal'> = {
  default: {},
  noir: {
    colorBack: "#000000",
    colorTint: "#616161"
  },
  backdrop: {
    colorBack: "#aaaaac",
    colorTint: "#ffffff"
  },
  stripes: {
    colorBack: "#000000",
    colorTint: "#2c5d72"
  },
};

export const gemSmokePresets: ShaderPreset<'gem-smoke'> = {
  default: {
    ...gemSmokePresetsData.find((preset) => preset.name === 'Default')?.params ?? {},
    scale: 2,
  },
  fire: {
    ...gemSmokePresetsData.find((preset) => preset.name === 'Fire')?.params ?? {},
    scale: 2
  },
  fluorescent: {
    ...gemSmokePresetsData.find((preset) => preset.name === 'Fluorescent')?.params ?? {},
    scale: 2
  },
  infrared: {
    ...gemSmokePresetsData.find((preset) => preset.name === 'Infrared')?.params ?? {},
    scale: 2
  },
};

export const heatmapPresets: ShaderPreset<'heatmap'> = {
  default: {
    ...heatmapPresetsData.find((preset) => preset.name === 'Default')?.params ?? {},
    scale: 3
  },
  sepia: {
    ...heatmapPresetsData.find((preset) => preset.name === 'Sepia')?.params ?? {},
    scale: 3
  },
};

export const meshGradientPresets: ShaderPreset<'mesh-gradient'> = {
  default: {},
  ink: {
    ...meshGradientPresetsData.find((preset) => preset.name === 'Ink')?.params ?? {},
    scale: 2
  },
  purple: {
    ...meshGradientPresetsData.find((preset) => preset.name === 'Purple')?.params ?? {},
    scale: 2
  },
  beach: {
    ...meshGradientPresetsData.find((preset) => preset.name === 'Beach')?.params ?? {},
    scale: 2
  }
};

export const warpPresets: ShaderPreset<'warp'> = {
  default: {},
  cauldron: {
    ...warpPresetsData.find((preset) => preset.name === 'Cauldron Pot')?.params ?? {},
    scale: 2
  },
  ink: {
    ...warpPresetsData.find((preset) => preset.name === 'Live Ink')?.params ?? {},
    scale: 2
  },
  kelp: {
    ...warpPresetsData.find((preset) => preset.name === 'Kelp')?.params ?? {},
    scale: 2
  },
  nectar: {
    ...warpPresetsData.find((preset) => preset.name === 'Nectar')?.params ?? {},
    scale: 2
  },
  passion: {
    ...warpPresetsData.find((preset) => preset.name === 'Passion')?.params ?? {},
    scale: 2
  },
};

export const spiralPresets: ShaderPreset<'spiral'> = {
  default: {
    ...spiralPresetsData.find((preset) => preset.name === 'Default')?.params ?? {},
    scale: 0.5
  },
  swirl: {
    ...spiralPresetsData.find((preset) => preset.name === 'Swirl')?.params ?? {},
    scale: 0.5
  },
  droplet: {
    ...spiralPresetsData.find((preset) => preset.name === 'Droplet')?.params ?? {},
    scale: 0.5
  },
  jungle: {
    ...spiralPresetsData.find((preset) => preset.name === 'Jungle')?.params ?? {},
    scale: 0.5
  },
};

export const swirlPresets: ShaderPreset<'swirl'> = {
  default: {
    ...swirlPresetsData.find((preset) => preset.name === 'Default')?.params ?? {},
    scale: 1
  },
  opening: {
    ...swirlPresetsData.find((preset) => preset.name === 'Opening')?.params ?? {},
    scale: 1
  },
  '007': {
    ...swirlPresetsData.find((preset) => preset.name === '007')?.params ?? {},
    scale: 1
  },
  candy: {
    ...swirlPresetsData.find((preset) => preset.name === 'Candy')?.params ?? {},
    scale: 1
  },
};

export const neuroNoisePresets: ShaderPreset<'neuro-noise'> = {
  default: {
    ...neuroNoisePresetsData.find((preset) => preset.name === 'Default')?.params ?? {},
    scale: 1
  },
  sensation: {
    ...neuroNoisePresetsData.find((preset) => preset.name === 'Sensation')?.params ?? {},
    scale: 2
  },
  bloodstream: {
    ...neuroNoisePresetsData.find((preset) => preset.name === 'Bloodstream')?.params ?? {},
    scale: 2
  },
  ghost: {
    ...neuroNoisePresetsData.find((preset) => preset.name === 'Ghost')?.params ?? {},
    scale: 2
  },
};

export const perlinNoisePresets: ShaderPreset<'perlin-noise'> = {
  default: {
    ...perlinNoisePresetsData.find((preset) => preset.name === 'Default')?.params ?? {},
    scale: 1
  },
  nintendo: {
    ...perlinNoisePresetsData.find((preset) => preset.name === 'Nintendo Water')?.params ?? {},
    scale: 2
  },
  moss: {
    ...perlinNoisePresetsData.find((preset) => preset.name === 'Moss')?.params ?? {},
    scale: 2
  },
  worms: {
    ...perlinNoisePresetsData.find((preset) => preset.name === 'Worms')?.params ?? {},
    scale: 2
  },
};

export const godRaysPresets: ShaderPreset<'god-rays'> = {
  default: {
    ...godRaysPresetsData.find((preset) => preset.name === 'Default')?.params ?? {},
    scale: 1
  },
  wrap: {
    ...godRaysPresetsData.find((preset) => preset.name === 'Wrap')?.params ?? {},
    scale: 2
  },
  linear: {
    ...godRaysPresetsData.find((preset) => preset.name === 'Linear')?.params ?? {},
    scale: 2
  },
  ether: {
    ...godRaysPresetsData.find((preset) => preset.name === 'Ether')?.params ?? {},
    scale: 2
  },
};

export const shaderTypes = {
  liquidMetal: {
    name: 'Liquid Metal',
    type: 'liquid-metal',
    presets: liquidMetalPresets,
  },
  gemSmoke: {
    name: 'Gem Smoke',
    type: 'gem-smoke',
    presets: gemSmokePresets,
  },
  heatmap: {
    name: 'Heatmap',
    type: 'heatmap',
    presets: heatmapPresets,
  },
  meshGradient: {
    name: 'Mesh Gradient',
    type: 'mesh-gradient',
    presets: meshGradientPresets,
  },
  warp: {
    name: 'Warp',
    type: 'warp',
    presets: warpPresets,
  },
  spiral: {
    name: 'Spiral',
    type: 'spiral',
    presets: spiralPresets,
  },
  swirl: {
    name: 'Swirl',
    type: 'swirl',
    presets: swirlPresets,
  },
  neuroNoise: {
    name: 'Neuro Noise',
    type: 'neuro-noise',
    presets: neuroNoisePresets,
  },
  perlinNoise: {
    name: 'Perlin Noise',
    type: 'perlin-noise',
    presets: perlinNoisePresets,
  },
  godRays: {
    name: 'God Rays',
    type: 'god-rays',
    presets: godRaysPresets,
  },
}