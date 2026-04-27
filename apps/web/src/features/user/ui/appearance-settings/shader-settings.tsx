'use client'

import { useTranslations } from 'next-intl'
import {
  type GemSmokePresetType,
  type GodRaysPresetType,
  type HeatmapPresetType,
  type LiquidMetalPresetType,
  type MeshGradientPresetType,
  type NeuroNoisePresetType,
  type PerlinNoisePresetType,
  type SpiralPresetType,
  type ShaderPresetType,
  type ShaderRenderMap,
  type ShaderType,
  type SwirlPresetType,
  type WarpPresetType,
  getShaderSliderFields,
  getShaderSliderValue,
  Shader,
} from '@ws/ui/components/mew-ui/shader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ws/ui/components/ui/select'
import { Label } from '@ws/ui/components/ui/label'
import { Slider } from '@ws/ui/components/ui/slider'
import { Switch } from '@ws/ui/components/ui/switch'
import { Button } from '@ws/ui/components/ui/button'
import { getShaderPresets } from '@/entities/user/lib'

function formatShaderPropLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
}

function formatPresetLabel(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

type Props = {
  shaderType: ShaderType
  shaderPreset: ShaderPresetType
  shaderAnimationEnabled: boolean
  setShaderType: (value: ShaderType) => void
  setShaderPreset: (value: ShaderPresetType) => void
  setShaderAnimationEnabled: (value: boolean) => void
  shaderProps?: ShaderRenderMap[ShaderType]
  setShaderProp: (key: string, value: number) => void
  onSaveDetails: () => Promise<void>
  isSavingDetails: boolean
  hasUnsavedDetails: boolean
  disabled: boolean
}

export function ShaderSettings({
  shaderType,
  shaderPreset,
  shaderAnimationEnabled,
  setShaderType,
  setShaderPreset,
  setShaderAnimationEnabled,
  shaderProps,
  setShaderProp,
  onSaveDetails,
  isSavingDetails,
  hasUnsavedDetails,
  disabled,
}: Props) {
  const t = useTranslations('settings')
  const presets = getShaderPresets(shaderType)
  const shaderTypeLabel = (() => {
    switch (shaderType) {
      case 'liquid-metal':
        return t('appearancePage.shaderTypeLiquidMetal')
      case 'gem-smoke':
        return t('appearancePage.shaderTypeGemSmoke')
      case 'heatmap':
        return t('appearancePage.shaderTypeHeatmap')
      case 'mesh-gradient':
        return t('appearancePage.shaderTypeMeshGradient')
      case 'warp':
        return t('appearancePage.shaderTypeWarp')
      case 'spiral':
        return t('appearancePage.shaderTypeSpiral')
      case 'swirl':
        return t('appearancePage.shaderTypeSwirl')
      case 'neuro-noise':
        return t('appearancePage.shaderTypeNeuroNoise')
      case 'perlin-noise':
        return t('appearancePage.shaderTypePerlinNoise')
      case 'god-rays':
        return t('appearancePage.shaderTypeGodRays')
    }
  })()
  const previewShaderProps = (() => {
    switch (shaderType) {
      case 'liquid-metal':
        return {
          type: 'liquid-metal',
          preset: shaderPreset as LiquidMetalPresetType,
        }
      case 'gem-smoke':
        return {
          type: 'gem-smoke',
          preset: shaderPreset as GemSmokePresetType,
        }
      case 'heatmap':
        return {
          type: 'heatmap',
          preset: shaderPreset as HeatmapPresetType,
        }
      case 'mesh-gradient':
        return {
          type: 'mesh-gradient',
          preset: shaderPreset as MeshGradientPresetType,
        }
      case 'warp':
        return {
          type: 'warp',
          preset: shaderPreset as WarpPresetType,
        }
      case 'spiral':
        return {
          type: 'spiral',
          preset: shaderPreset as SpiralPresetType,
        }
      case 'swirl':
        return {
          type: 'swirl',
          preset: shaderPreset as SwirlPresetType,
        }
      case 'neuro-noise':
        return {
          type: 'neuro-noise',
          preset: shaderPreset as NeuroNoisePresetType,
        }
      case 'perlin-noise':
        return {
          type: 'perlin-noise',
          preset: shaderPreset as PerlinNoisePresetType,
        }
      case 'god-rays':
        return {
          type: 'god-rays',
          preset: shaderPreset as GodRaysPresetType,
        }
    }
  })() as React.ComponentProps<typeof Shader>
  const sliderFields = getShaderSliderFields(shaderType)
  const shaderPropLabels: Record<string, string> = {
    repetition: t('appearancePage.shaderPropLabels.repetition'),
    softness: t('appearancePage.shaderPropLabels.softness'),
    shiftRed: t('appearancePage.shaderPropLabels.shiftRed'),
    shiftBlue: t('appearancePage.shaderPropLabels.shiftBlue'),
    distortion: t('appearancePage.shaderPropLabels.distortion'),
    contour: t('appearancePage.shaderPropLabels.contour'),
    angle: t('appearancePage.shaderPropLabels.angle'),
    speed: t('appearancePage.shaderPropLabels.speed'),
    scale: t('appearancePage.shaderPropLabels.scale'),
    offsetX: t('appearancePage.shaderPropLabels.offsetX'),
    offsetY: t('appearancePage.shaderPropLabels.offsetY'),
    swirl: t('appearancePage.shaderPropLabels.swirl'),
    grainMixer: t('appearancePage.shaderPropLabels.grainMixer'),
    grainOverlay: t('appearancePage.shaderPropLabels.grainOverlay'),
    rotation: t('appearancePage.shaderPropLabels.rotation'),
    originX: t('appearancePage.shaderPropLabels.originX'),
    originY: t('appearancePage.shaderPropLabels.originY'),
    proportion: t('appearancePage.shaderPropLabels.proportion'),
    swirlIterations: t('appearancePage.shaderPropLabels.swirlIterations'),
    shapeScale: t('appearancePage.shaderPropLabels.shapeScale'),
    density: t('appearancePage.shaderPropLabels.density'),
    strokeWidth: t('appearancePage.shaderPropLabels.strokeWidth'),
    strokeTaper: t('appearancePage.shaderPropLabels.strokeTaper'),
    strokeCap: t('appearancePage.shaderPropLabels.strokeCap'),
    noise: t('appearancePage.shaderPropLabels.noise'),
    noiseFrequency: t('appearancePage.shaderPropLabels.noiseFrequency'),
    bandCount: t('appearancePage.shaderPropLabels.bandCount'),
    center: t('appearancePage.shaderPropLabels.center'),
    brightness: t('appearancePage.shaderPropLabels.brightness'),
    contrast: t('appearancePage.shaderPropLabels.contrast'),
    octaveCount: t('appearancePage.shaderPropLabels.octaveCount'),
    persistence: t('appearancePage.shaderPropLabels.persistence'),
    lacunarity: t('appearancePage.shaderPropLabels.lacunarity'),
    bloom: t('appearancePage.shaderPropLabels.bloom'),
    intensity: t('appearancePage.shaderPropLabels.intensity'),
    spotty: t('appearancePage.shaderPropLabels.spotty'),
    midSize: t('appearancePage.shaderPropLabels.midSize'),
    midIntensity: t('appearancePage.shaderPropLabels.midIntensity'),
  }

  const getSliderValue = (field: (typeof sliderFields)[number]) => {
    return getShaderSliderValue(
      shaderType,
      shaderPreset,
      field.key,
      shaderProps as Record<string, unknown> | undefined
    )
  }

  const getSliderLabel = (key: string) => {
    return shaderPropLabels[key] ?? formatShaderPropLabel(key)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="shader-animation">{t('appearancePage.shaderAnimation')}</Label>
            <p className="text-sm text-muted-foreground">{t('appearancePage.shaderAnimationHint')}</p>
          </div>
          <Switch
            id="shader-animation"
            checked={shaderAnimationEnabled}
            onCheckedChange={setShaderAnimationEnabled}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center  justify-between">
          <div className="space-y-2">
            <Label htmlFor="shader-type">{t('appearancePage.shaderType')}</Label>
            <p className="text-sm text-muted-foreground">{t('appearancePage.shaderTypeHint')}</p>
          </div>
          <Select value={shaderType} onValueChange={(value) => setShaderType((value as ShaderType) ?? 'gem-smoke')} disabled={disabled}>
            <SelectTrigger id="shader-type">
              <SelectValue className="capitalize">{shaderTypeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gem-smoke">{t('appearancePage.shaderTypeGemSmoke')}</SelectItem>
              <SelectItem value="liquid-metal">{t('appearancePage.shaderTypeLiquidMetal')}</SelectItem>
              <SelectItem value="heatmap">{t('appearancePage.shaderTypeHeatmap')}</SelectItem>
              <SelectItem value="mesh-gradient">{t('appearancePage.shaderTypeMeshGradient')}</SelectItem>
              <SelectItem value="warp">{t('appearancePage.shaderTypeWarp')}</SelectItem>
              <SelectItem value="spiral">{t('appearancePage.shaderTypeSpiral')}</SelectItem>
              <SelectItem value="swirl">{t('appearancePage.shaderTypeSwirl')}</SelectItem>
              <SelectItem value="neuro-noise">{t('appearancePage.shaderTypeNeuroNoise')}</SelectItem>
              <SelectItem value="perlin-noise">{t('appearancePage.shaderTypePerlinNoise')}</SelectItem>
              <SelectItem value="god-rays">{t('appearancePage.shaderTypeGodRays')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex  items-center justify-between">
          <div className="space-y-2">
            <Label htmlFor="shader-preset">{t('appearancePage.shaderPreset')}</Label>
            <p className="text-sm text-muted-foreground">{t('appearancePage.shaderPresetHint')}</p>
          </div>
          <Select
            value={shaderPreset}
            onValueChange={(value) => {
              if (value) {
                setShaderPreset(value as ShaderPresetType)
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="shader-preset">
              <SelectValue>{formatPresetLabel(shaderPreset)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset} value={preset}>{formatPresetLabel(preset)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-4'>
          <div className="space-y-1">
            <Label>{t('appearancePage.shaderDetailsTitle')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('appearancePage.shaderDetailsHint')}
            </p>
          </div>
          {sliderFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('appearancePage.shaderDetailsEmpty')}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {sliderFields.map((field) => {
                  const currentValue = getSliderValue(field)
                  return (
                    <div key={field.key} className="space-y-2 rounded-lg border border-border/50 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="capitalize">{getSliderLabel(field.key)}</Label>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Number(currentValue.toFixed(3))}
                        </span>
                      </div>
                      <Slider
                        value={[currentValue]}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        onValueChange={(value) => {
                          const nextValue = value[0]
                          if (typeof nextValue === 'number') {
                            setShaderProp(field.key, nextValue)
                          }
                        }}
                        disabled={disabled}
                      />
                    </div>
                  )
                })}
              </div>
              {hasUnsavedDetails ? (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => void onSaveDetails()}
                    disabled={disabled || isSavingDetails}
                  >
                    {t('appearancePage.save')}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
        <div className='h-56 w-full rounded-lg border border-border/50 p-1'>
          <Shader
            {...previewShaderProps}
            props={shaderProps}
            disabled={!shaderAnimationEnabled}
            preview
            className="h-full w-full rounded-lg"
          />
        </div>
      </div>
    </div>
  )
}
