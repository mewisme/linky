'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ws/ui/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ws/ui/components/ui/select'
import type { UiLocale } from '@ws/shared-types'
import { useTranslations } from 'next-intl'
import { useRouter as useNextRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { Label } from '@ws/ui/components/ui/label'
import { Separator } from '@ws/ui/components/ui/separator'
import { toast } from '@ws/ui/components/ui/sonner'
import { updateUserSettings } from '@/features/user/api/settings'
import { useSidebarStore } from '@/shared/model/sidebar-store'
import { useUserStore } from '@/entities/user/model/user-store'
import { isVideoChatBlockingLocaleChange } from '@/features/call/lib/video-chat-locale-block'
import { useVideoChatStore } from '@/features/call/model/video-chat-store'
import { useLocalePreferenceStore } from '@/shared/model/locale-preference-store'
import { useLocaleChangeGuardStore } from '@/shared/model/locale-change-guard-store'
import type { UsersAPI } from '@/entities/user/types/users.types'
import { useShaderPreferenceStore } from '@/shared/model/shader-preference-store'
import { useDebounceCallback } from '@/shared/hooks/common/use-debounce-callback'
import {
  normalizeUserLanguage,
  normalizeUserShaderPreferences,
  normalizeUserSidebarPreferences,
} from '@/entities/user/lib'
import type { ShaderPresetType, ShaderType } from '@ws/ui/components/mew-ui/shader'
import type { SidebarCollapsible, SidebarVariant } from '@/shared/model/sidebar-store'
import { ShaderSettings } from './shader-settings'
import { SidebarSettings } from './sidebar-settings'
import { VideoDefaultsSettings } from './video-defaults-settings'

const APPEARANCE_AUTOSAVE_DEBOUNCE_MS = 3000

interface Props {
  initialSettings: UsersAPI.UserSettings.GetMe.Response
}

export function AppearanceSettingsClient({ initialSettings }: Props) {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const router = useRouter()
  const nextRouter = useNextRouter()
  const pathname = usePathname()
  const setPersistedLocale = useLocalePreferenceStore((s) => s.setLocale)
  const setShaderPreference = useShaderPreferenceStore((s) => s.setShader)
  const setVariant = useSidebarStore((s) => s.setVariant)
  const setCollapsible = useSidebarStore((s) => s.setCollapsible)
  const initialShader = normalizeUserShaderPreferences(initialSettings.shader)
  const initialSidebar = normalizeUserSidebarPreferences(initialSettings.sidebar)
  const initialLocale = normalizeUserLanguage(initialSettings.language) ?? useLocalePreferenceStore.getState().locale
  const [defaultMuteMic, setDefaultMuteMic] = useState(initialSettings.default_mute_mic ?? false)
  const [defaultDisableCamera, setDefaultDisableCamera] = useState(initialSettings.default_disable_camera ?? false)
  const [shaderType, setShaderType] = useState<ShaderType>(initialShader.type)
  const [shaderPreset, setShaderPreset] = useState<ShaderPresetType>(initialShader.preset)
  const [shaderAnimationEnabled, setShaderAnimationEnabled] = useState<boolean>(!initialShader.disableAnimation)
  const [sidebarVariant, setSidebarVariant] = useState<SidebarVariant>(initialSidebar.variant)
  const [sidebarCollapsible, setSidebarCollapsible] = useState<SidebarCollapsible>(initialSidebar.collapsible)
  const [uiLocaleDraft, setUiLocaleDraft] = useState<UiLocale>(initialLocale)
  const [draftVersion, setDraftVersion] = useState(0)
  const hasMountedRef = useRef(false)
  const lastSavedKeyRef = useRef<string | null>(null)
  const inFlightPayloadKeyRef = useRef<string | null>(null)
  const lastScheduledVersionRef = useRef(0)

  const markUserInteracted = () => {
    setDraftVersion((value) => value + 1)
  }

  useEffect(() => {
    const applyStoredLocale = () => {
      const persisted = useLocalePreferenceStore.getState().locale
      const resolved = normalizeUserLanguage(initialSettings.language) ?? persisted
      setUiLocaleDraft(resolved)
    }
    if (useLocalePreferenceStore.persist.hasHydrated()) {
      applyStoredLocale()
    }
    return useLocalePreferenceStore.persist.onFinishHydration(applyStoredLocale)
  }, [initialSettings.language])

  useEffect(() => {
    setSidebarVariant(initialSidebar.variant)
    setSidebarCollapsible(initialSidebar.collapsible)
  }, [initialSidebar.collapsible, initialSidebar.variant, setCollapsible, setVariant])

  useEffect(() => {
    setVariant(sidebarVariant)
  }, [setVariant, sidebarVariant])

  useEffect(() => {
    setCollapsible(sidebarCollapsible)
  }, [setCollapsible, sidebarCollapsible])

  useEffect(() => {
    setShaderPreference({
      type: shaderType,
      preset: shaderPreset,
      disableAnimation: !shaderAnimationEnabled,
    })
  }, [setShaderPreference, shaderAnimationEnabled, shaderPreset, shaderType])

  useEffect(() => {
    const current = useUserStore.getState().userSettings
    if (!current) {
      return
    }
    useUserStore.getState().setUserSettings({
      ...current,
      shader: {
        type: shaderType,
        preset: shaderPreset,
        disableAnimation: !shaderAnimationEnabled,
      },
      sidebar: {
        variant: sidebarVariant,
        collapsible: sidebarCollapsible,
      },
      language: uiLocaleDraft,
      default_mute_mic: defaultMuteMic,
      default_disable_camera: defaultDisableCamera,
    })
  }, [
    sidebarCollapsible,
    defaultDisableCamera,
    defaultMuteMic,
    shaderAnimationEnabled,
    shaderPreset,
    shaderType,
    uiLocaleDraft,
    sidebarVariant,
  ])

  const payload = useMemo<UsersAPI.UserSettings.PatchMe.Body>(() => ({
    default_mute_mic: defaultMuteMic,
    default_disable_camera: defaultDisableCamera,
    language: uiLocaleDraft,
    shader: { type: shaderType, preset: shaderPreset, disableAnimation: !shaderAnimationEnabled },
    sidebar: { variant: sidebarVariant, collapsible: sidebarCollapsible },
  }), [
    sidebarCollapsible,
    defaultDisableCamera,
    defaultMuteMic,
    shaderAnimationEnabled,
    shaderPreset,
    shaderType,
    uiLocaleDraft,
    sidebarVariant,
  ])

  const debouncedAutosave = useDebounceCallback(
    (...args: unknown[]) => {
      const [nextPayload] = args as [UsersAPI.UserSettings.PatchMe.Body]
      const payloadKey = JSON.stringify(nextPayload)
      if (payloadKey === lastSavedKeyRef.current || payloadKey === inFlightPayloadKeyRef.current) {
        return
      }
      inFlightPayloadKeyRef.current = payloadKey
      void updateUserSettings(nextPayload)
        .then(() => {
          lastSavedKeyRef.current = payloadKey
          toast.success(t('appearancePage.updated'))
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : t('appearancePage.updateFailed'))
        })
        .finally(() => {
          if (inFlightPayloadKeyRef.current === payloadKey) {
            inFlightPayloadKeyRef.current = null
          }
        })
    },
    APPEARANCE_AUTOSAVE_DEBOUNCE_MS,
    { trailing: true, leading: false, cancelOnUnmount: false },
  )

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    if (draftVersion === 0) {
      return
    }
    if (lastScheduledVersionRef.current === draftVersion) {
      return
    }
    lastScheduledVersionRef.current = draftVersion
    debouncedAutosave(payload)
  }, [debouncedAutosave, draftVersion, payload])

  const handleLocaleChange = (nextLocale: UiLocale) => {
    markUserInteracted()
    setUiLocaleDraft(nextLocale)

    if (isVideoChatBlockingLocaleChange(useVideoChatStore.getState().connectionStatus)) {
      useLocaleChangeGuardStore.getState().openDialog(nextLocale, () => {
        setPersistedLocale(nextLocale)
        router.replace(pathname, { locale: nextLocale })
        nextRouter.refresh()
      })
      return
    }

    setPersistedLocale(nextLocale)
    router.replace(pathname, { locale: nextLocale })
    nextRouter.refresh()
  }

  return (
    <AppLayout label={t('appearancePage.label')} description={t('appearancePage.description')} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('appearancePage.cardTitle')}</CardTitle>
          <CardDescription>
            {t('appearancePage.cardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="ui-locale">{t('appearancePage.language')}</Label>
              <p className="text-sm text-muted-foreground">{t('appearancePage.languageHint')}</p>
            </div>
            <Select
              value={uiLocaleDraft}
              onValueChange={(value) => {
                if (value === 'en' || value === 'vi') handleLocaleChange(value)
              }}
              disabled={false}
            >
              <SelectTrigger id="ui-locale" className="w-[200px]">
                <SelectValue>
                  {uiLocaleDraft === 'vi' ? tc('vietnamese') : tc('english')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{tc('english')}</SelectItem>
                <SelectItem value="vi">{tc('vietnamese')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <ShaderSettings
            shaderType={shaderType}
            shaderPreset={shaderPreset}
            shaderAnimationEnabled={shaderAnimationEnabled}
            setShaderType={(value) => {
              markUserInteracted()
              setShaderType(value)
              setShaderPreset('default')
            }}
            setShaderPreset={(value) => {
              markUserInteracted()
              setShaderPreset(value)
            }}
            setShaderAnimationEnabled={(value) => {
              markUserInteracted()
              setShaderAnimationEnabled(value)
            }}
            disabled={false}
          />
          <Separator />
          <VideoDefaultsSettings
            defaultMuteMic={defaultMuteMic}
            defaultDisableCamera={defaultDisableCamera}
            onDefaultMuteMicChange={(value) => {
              markUserInteracted()
              setDefaultMuteMic(value)
            }}
            onDefaultDisableCameraChange={(value) => {
              markUserInteracted()
              setDefaultDisableCamera(value)
            }}
          />
          <Separator />
          <SidebarSettings
            disabled={false}
            variant={sidebarVariant}
            collapsible={sidebarCollapsible}
            onVariantChange={(value) => {
              markUserInteracted()
              setSidebarVariant(value)
            }}
            onCollapsibleChange={(value) => {
              markUserInteracted()
              setSidebarCollapsible(value)
            }}
          />
        </CardContent>
      </Card>
    </AppLayout>
  )
}
