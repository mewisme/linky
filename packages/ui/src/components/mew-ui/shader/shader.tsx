'use client';

import { cn } from '@ws/ui/lib/utils';
import {
  LiquidMetal,
  type LiquidMetalProps,
  GemSmoke,
  type GemSmokeProps,
  Heatmap,
  type HeatmapProps,
  MeshGradient,
  type MeshGradientProps,
  Warp,
  type WarpProps,
  Spiral,
  type SpiralProps,
  Swirl,
  type SwirlProps,
  NeuroNoise,
  type NeuroNoiseProps,
  PerlinNoise,
  type PerlinNoiseProps,
  GodRays,
  type GodRaysProps,
} from '@paper-design/shaders-react';
import type { ShaderPropsMap, ShaderType } from './types';
import {
  liquidMetalPresets,
  gemSmokePresets,
  heatmapPresets,
  meshGradientPresets,
  warpPresets,
  spiralPresets,
  swirlPresets,
  neuroNoisePresets,
  perlinNoisePresets,
  godRaysPresets,
} from './presets';

export type ShaderProps<T extends ShaderType> = {
  type: T;
  className?: string;
  disableAnimation?: boolean;
} & ShaderPropsMap[T];

type AnyShaderProps = {
  [K in ShaderType]: ShaderProps<K>;
}[ShaderType];


export function Shader(props: AnyShaderProps) {
  if (props.disableAnimation) {
    return null;
  }

  if (props.type === 'liquid-metal') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = liquidMetalPresets[preset];
    const mergedValues: Partial<Omit<LiquidMetalProps, 'className' | 'style' | 'shape'>> = {
      speed: 0.6,
      repetition: 4,
      softness: 0.5,
      shiftRed: 0.3,
      shiftBlue: 0.3,
      distortion: 0,
      contour: 0,
      angle: 45,
      scale: 8,
      offsetX: 0.1,
      offsetY: -0.1,
      ...presetValues,
      ...propValues,
    };

    return (
      <LiquidMetal
        key={`liquid-metal:${preset}`}
        data-slot="shader"
        className={cn(className)}
        shape="none"
        {...mergedValues}
      />
    );
  }

  if (props.type === 'gem-smoke') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = gemSmokePresets[preset];
    const mergedValues: Partial<Omit<GemSmokeProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
      shape: 'none',
    };

    return (
      <GemSmoke
        key={`gem-smoke:${preset}`}
        data-slot="shader"
        className={cn(className)}
        shape="none"
        {...mergedValues}
      />
    );
  }

  if (props.type === 'heatmap') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = heatmapPresets[preset];
    const mergedValues: Partial<Omit<HeatmapProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Heatmap
        key={`heatmap:${preset}`}
        data-slot="shader"
        className={cn(className)}
        image={"/images/rectangle.svg"}
        {...mergedValues}
      />
    );
  }

  if (props.type === 'mesh-gradient') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = meshGradientPresets[preset];
    const mergedValues: Partial<Omit<MeshGradientProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <MeshGradient
        key={`mesh-gradient:${preset}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (props.type === 'warp') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = warpPresets[preset];
    const mergedValues: Partial<Omit<WarpProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Warp
        key={`warp:${preset}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (props.type === 'spiral') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = spiralPresets[preset];
    const mergedValues: Partial<Omit<SpiralProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Spiral
        key={`spiral:${preset}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (props.type === 'swirl') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = swirlPresets[preset];
    const mergedValues: Partial<Omit<SwirlProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Swirl
        key={`swirl:${preset}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (props.type === 'neuro-noise') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = neuroNoisePresets[preset];
    const mergedValues: Partial<Omit<NeuroNoiseProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <NeuroNoise
        key={`neuro-noise:${preset}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (props.type === 'perlin-noise') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = perlinNoisePresets[preset];
    const mergedValues: Partial<Omit<PerlinNoiseProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <PerlinNoise
        key={`perlin-noise:${preset}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (props.type === 'god-rays') {
    const {
      className,
      preset = 'default',
      disableAnimation,
      ...propValues
    } = props;
    void disableAnimation;
    const presetValues = godRaysPresets[preset];
    const mergedValues: Partial<Omit<GodRaysProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <GodRays
        key={`god-rays:${preset}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  return null;
}