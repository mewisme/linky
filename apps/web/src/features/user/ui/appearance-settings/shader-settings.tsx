'use client'

import { useTranslations } from 'next-intl'
import type {
  GemSmokePresetType,
  GodRaysPresetType,
  HeatmapPresetType,
  LiquidMetalPresetType,
  MeshGradientPresetType,
  NeuroNoisePresetType,
  PerlinNoisePresetType,
  SpiralPresetType,
  ShaderPresetType,
  ShaderType,
  SwirlPresetType,
  WarpPresetType,
} from '@ws/ui/components/mew-ui/shader'
import { Shader } from '@ws/ui/components/mew-ui/shader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ws/ui/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ws/ui/components/ui/accordion'
import { Label } from '@ws/ui/components/ui/label'
import { Switch } from '@ws/ui/components/ui/switch'
import { getShaderPresets } from '@/entities/user/lib'

type Props = {
  shaderType: ShaderType
  shaderPreset: ShaderPresetType
  shaderAnimationEnabled: boolean
  setShaderType: (value: ShaderType) => void
  setShaderPreset: (value: ShaderPresetType) => void
  setShaderAnimationEnabled: (value: boolean) => void
  disabled: boolean
}

export function ShaderSettings({
  shaderType,
  shaderPreset,
  shaderAnimationEnabled,
  setShaderType,
  setShaderPreset,
  setShaderAnimationEnabled,
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

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t('appearancePage.shaderSection')}
      </h3>
      <div className="grid gap-4">
        <Accordion className="w-full">
          <AccordionItem value="shader-preview" className="border-b-0">
            <AccordionTrigger className="py-0 text-sm font-medium hover:no-underline">
              {t('appearancePage.shaderPreview')}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="relative h-28 overflow-hidden rounded-xl border border-border/60 bg-card">
                <Shader
                  width="100%"
                  className='h-96'
                  disableAnimation={!shaderAnimationEnabled}
                  {...previewShaderProps}
                />
                <div className="absolute inset-[2px] rounded-[10px] border border-white/10 bg-black/20" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="flex justify-between">
          <div className="space-y-2">
            <Label htmlFor="shader-type">{t('appearancePage.shaderType')}</Label>
            <p className="text-sm text-muted-foreground">{t('appearancePage.shaderTypeHint')}</p>
          </div>
          <Select value={shaderType} onValueChange={(value) => setShaderType((value as ShaderType) ?? 'gem-smoke')} disabled={disabled}>
            <SelectTrigger id="shader-type">
              <SelectValue>{shaderTypeLabel}</SelectValue>
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
        <div className="flex justify-between">
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
              <SelectValue className="capitalize">{shaderPreset}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset} value={preset} className="capitalize">{preset}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>
    </div>
  )
}
