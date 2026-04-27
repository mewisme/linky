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
import type { ShaderPresetMap, ShaderRenderMap, ShaderType } from './types';
import { useShaderConfig } from './shader-config-provider';
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
  type?: T;
  preset?: keyof ShaderPresetMap[T];
  props?: ShaderRenderMap[T];
  className?: string;
  disabled?: boolean;
  preview?: boolean;
};

type AnyShaderProps = {
  [K in ShaderType]: ShaderProps<K>;
}[ShaderType];

function resolvePreset(type: ShaderType, preset: string | undefined) {
  if (!preset) {
    return 'default';
  }

  if (type === 'liquid-metal') {
    return preset in liquidMetalPresets ? preset : 'default';
  }

  if (type === 'gem-smoke') {
    return preset in gemSmokePresets ? preset : 'default';
  }

  if (type === 'heatmap') {
    return preset in heatmapPresets ? preset : 'default';
  }

  if (type === 'mesh-gradient') {
    return preset in meshGradientPresets ? preset : 'default';
  }

  if (type === 'warp') {
    return preset in warpPresets ? preset : 'default';
  }

  if (type === 'spiral') {
    return preset in spiralPresets ? preset : 'default';
  }

  if (type === 'swirl') {
    return preset in swirlPresets ? preset : 'default';
  }

  if (type === 'neuro-noise') {
    return preset in neuroNoisePresets ? preset : 'default';
  }

  if (type === 'perlin-noise') {
    return preset in perlinNoisePresets ? preset : 'default';
  }

  return preset in godRaysPresets ? preset : 'default';
}


export function Shader(props: AnyShaderProps) {
  const shaderConfig = useShaderConfig();
  const shaderType = props.type ?? shaderConfig.type;
  const shaderPreset = resolvePreset(shaderType, (props.preset ?? shaderConfig.preset) as string);
  const shaderDisabled = props.disabled ?? shaderConfig.disabled;
  const shaderRenderProps = props.props ?? shaderConfig.props;
  const previewSuffix = props.preview ? `:${JSON.stringify(props.props ?? shaderRenderProps ?? {})}` : '';

  if (shaderDisabled) {
    return null;
  }

  if (shaderType === 'liquid-metal') {
    const {
      className,
      props: propValues = {
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
        ...(shaderRenderProps as ShaderRenderMap['liquid-metal'])
      },
    } = props;
    const presetValues = liquidMetalPresets[shaderPreset as keyof typeof liquidMetalPresets];
    const mergedValues: Partial<Omit<LiquidMetalProps, 'className' | 'style' | 'shape'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <LiquidMetal
        key={`liquid-metal:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        shape="none"
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'gem-smoke') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['gem-smoke'])
      },
    } = props;
    const presetValues = gemSmokePresets[shaderPreset as keyof typeof gemSmokePresets];
    const mergedValues: Partial<Omit<GemSmokeProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
      shape: 'none',
    };

    return (
      <GemSmoke
        key={`gem-smoke:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        shape="none"
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'heatmap') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['heatmap'])
      },
    } = props;
    const presetValues = heatmapPresets[shaderPreset as keyof typeof heatmapPresets];
    const mergedValues: Partial<Omit<HeatmapProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Heatmap
        key={`heatmap:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        image={"/images/rectangle.svg"}
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'mesh-gradient') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['mesh-gradient'])
      },
    } = props;
    const presetValues = meshGradientPresets[shaderPreset as keyof typeof meshGradientPresets];
    const mergedValues: Partial<Omit<MeshGradientProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <MeshGradient
        key={`mesh-gradient:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'warp') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['warp'])
      },
    } = props;
    const presetValues = warpPresets[shaderPreset as keyof typeof warpPresets];
    const mergedValues: Partial<Omit<WarpProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Warp
        key={`warp:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'spiral') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['spiral'])
      },
    } = props;
    const presetValues = spiralPresets[shaderPreset as keyof typeof spiralPresets];
    const mergedValues: Partial<Omit<SpiralProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Spiral
        key={`spiral:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'swirl') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['swirl'])
      },
    } = props;
    const presetValues = swirlPresets[shaderPreset as keyof typeof swirlPresets];
    const mergedValues: Partial<Omit<SwirlProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <Swirl
        key={`swirl:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'neuro-noise') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['neuro-noise'])
      },
    } = props;
    const presetValues = neuroNoisePresets[shaderPreset as keyof typeof neuroNoisePresets];
    const mergedValues: Partial<Omit<NeuroNoiseProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <NeuroNoise
        key={`neuro-noise:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'perlin-noise') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['perlin-noise'])
      },
    } = props;
    const presetValues = perlinNoisePresets[shaderPreset as keyof typeof perlinNoisePresets];
    const mergedValues: Partial<Omit<PerlinNoiseProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <PerlinNoise
        key={`perlin-noise:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  if (shaderType === 'god-rays') {
    const {
      className,
      props: propValues = {
        ...(shaderRenderProps as ShaderRenderMap['god-rays'])
      },
    } = props;
    const presetValues = godRaysPresets[shaderPreset as keyof typeof godRaysPresets];
    const mergedValues: Partial<Omit<GodRaysProps, 'className' | 'style'>> = {
      ...presetValues,
      ...propValues,
    };

    return (
      <GodRays
        key={`god-rays:${shaderPreset}${previewSuffix}`}
        data-slot="shader"
        className={cn(className)}
        {...mergedValues}
      />
    );
  }

  return null;
}