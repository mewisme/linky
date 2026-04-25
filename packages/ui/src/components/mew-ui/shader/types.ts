import { LiquidMetalProps, GemSmokeProps, HeatmapProps, MeshGradientProps, WarpProps, SpiralProps, SwirlProps, NeuroNoiseProps, PerlinNoiseProps, GodRaysProps } from '@paper-design/shaders-react'

export type GemSmokePresetType = 'default' | 'fire' | 'fluorescent' | 'infrared'
export type LiquidMetalPresetType = 'default' | 'noir' | 'backdrop' | 'stripes'
export type HeatmapPresetType = 'default' | 'sepia'
export type MeshGradientPresetType = 'default' | 'ink' | 'purple' | 'beach'
export type WarpPresetType = 'default' | 'cauldron' | 'ink' | 'kelp' | 'nectar' | 'passion'
export type SpiralPresetType = 'default' | 'swirl' | 'jungle' | 'droplet'
export type SwirlPresetType = 'default' | 'opening' | '007' | 'candy'
export type NeuroNoisePresetType = 'default' | 'sensation' | 'bloodstream' | 'ghost'
export type PerlinNoisePresetType = 'default' | 'nintendo' | 'moss' | 'worms'
export type GodRaysPresetType = 'default' | 'wrap' | 'linear' | 'ether'

export type ShaderType = 'liquid-metal' | 'gem-smoke' | 'heatmap' | 'mesh-gradient' | 'warp' | 'spiral' | 'swirl' | 'neuro-noise' | 'perlin-noise' | 'god-rays'

export type ShaderRenderMap = {
  'liquid-metal': Partial<Omit<LiquidMetalProps, 'className' | 'style' | 'shape'>>
  'gem-smoke': Partial<Omit<GemSmokeProps, 'className' | 'style' | 'shape'>>
  'heatmap': Partial<Omit<HeatmapProps, 'className' | 'style' | 'shape'>>
  'mesh-gradient': Partial<Omit<MeshGradientProps, 'className' | 'style'>>
  'warp': Partial<Omit<WarpProps, 'className' | 'style'>>
  'spiral': Partial<Omit<SpiralProps, 'className' | 'style'>>
  'swirl': Partial<Omit<SwirlProps, 'className' | 'style'>>
  'neuro-noise': Partial<Omit<NeuroNoiseProps, 'className' | 'style'>>
  'perlin-noise': Partial<Omit<PerlinNoiseProps, 'className' | 'style'>>
  'god-rays': Partial<Omit<GodRaysProps, 'className' | 'style'>>
}

export type GemSmokePreset = {
  [key in GemSmokePresetType]: ShaderRenderMap['gem-smoke']
}

export type LiquidMetalPreset = {
  [key in LiquidMetalPresetType]: ShaderRenderMap['liquid-metal']
}

export type HeatmapPreset = {
  [key in HeatmapPresetType]: ShaderRenderMap['heatmap']
}

export type MeshGradientPreset = {
  [key in MeshGradientPresetType]: ShaderRenderMap['mesh-gradient']
}

export type WarpPreset = {
  [key in WarpPresetType]: ShaderRenderMap['warp']
}

export type SpiralPreset = {
  [key in SpiralPresetType]: ShaderRenderMap['spiral']
}

export type SwirlPreset = {
  [key in SwirlPresetType]: ShaderRenderMap['swirl']
}

export type NeuroNoisePreset = {
  [key in NeuroNoisePresetType]: ShaderRenderMap['neuro-noise']
}

export type PerlinNoisePreset = {
  [key in PerlinNoisePresetType]: ShaderRenderMap['perlin-noise']
}

export type GodRaysPreset = {
  [key in GodRaysPresetType]: ShaderRenderMap['god-rays']
}

export type ShaderPresetMap = {
  'liquid-metal': LiquidMetalPreset
  'gem-smoke': GemSmokePreset
  'heatmap': HeatmapPreset
  'mesh-gradient': MeshGradientPreset
  'warp': WarpPreset
  'spiral': SpiralPreset
  'swirl': SwirlPreset
  'neuro-noise': NeuroNoisePreset
  'perlin-noise': PerlinNoisePreset
  'god-rays': GodRaysPreset
}

export type ShaderPropsMap = {
  'liquid-metal': ShaderRenderMap['liquid-metal'] & {
    preset?: LiquidMetalPresetType
  }
  'gem-smoke': ShaderRenderMap['gem-smoke'] & {
    preset?: GemSmokePresetType
  }
  'heatmap': ShaderRenderMap['heatmap'] & {
    preset?: HeatmapPresetType
  }
  'mesh-gradient': ShaderRenderMap['mesh-gradient'] & {
    preset?: MeshGradientPresetType
  }
  'warp': ShaderRenderMap['warp'] & {
    preset?: WarpPresetType
  }
  'spiral': ShaderRenderMap['spiral'] & {
    preset?: SpiralPresetType
  }
  'swirl': ShaderRenderMap['swirl'] & {
    preset?: SwirlPresetType
  }
  'neuro-noise': ShaderRenderMap['neuro-noise'] & {
    preset?: NeuroNoisePresetType
  }
  'perlin-noise': ShaderRenderMap['perlin-noise'] & {
    preset?: PerlinNoisePresetType
  }
  'god-rays': ShaderRenderMap['god-rays'] & {
    preset?: GodRaysPresetType
  }
}

export type ShaderRender<T extends ShaderType = ShaderType> = ShaderRenderMap[T]
export type ShaderPreset<T extends ShaderType = ShaderType> = ShaderPresetMap[T]

export type ShaderPresetType =
  | LiquidMetalPresetType
  | GemSmokePresetType
  | HeatmapPresetType
  | MeshGradientPresetType
  | WarpPresetType
  | SpiralPresetType
  | SwirlPresetType
  | NeuroNoisePresetType
  | PerlinNoisePresetType
  | GodRaysPresetType