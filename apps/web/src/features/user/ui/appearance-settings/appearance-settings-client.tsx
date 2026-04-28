'use client'

import {
  ShaderCard,
  CardContent,
} from '@ws/ui/components/mew-ui/shader/shader-card'
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
import { toast } from '@ws/ui/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ws/ui/components/ui/tabs'
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route'
import { useSidebarStore } from '@/shared/model/sidebar-store'
import { useUserStore } from '@/entities/user/model/user-store'
import { isVideoChatBlockingLocaleChange } from '@/features/call/lib/video-chat-locale-block'
import { useVideoChatStore } from '@/features/call/model/video-chat-store'
import { useLocalePreferenceStore } from '@/shared/model/locale-preference-store'
import { useLocaleChangeGuardStore } from '@/shared/model/locale-change-guard-store'
import type { UsersAPI } from '@/entities/user/types/users.types'
import { useDebounceCallback } from '@/shared/hooks/common/use-debounce-callback'
import { useSetShaderConfig } from '@ws/ui/components/mew-ui/shader'
import {
  normalizeUserLanguage,
  normalizeUserShaderPreferences,
  normalizeUserSidebarPreferences,
} from '@/entities/user/lib'
import type { ShaderPresetType, ShaderRenderMap, ShaderType } from '@ws/ui/components/mew-ui/shader'
import type { SidebarCollapsible, SidebarVariant } from '@/shared/model/sidebar-store'
import { useShaderPreferenceStore } from '@/shared/model/shader-preference-store'
import { ShaderSettings } from './shader-settings'
import { SidebarSettings } from './sidebar-settings'
import { VideoDefaultsSettings } from './video-defaults-settings'

const APPEARANCE_AUTOSAVE_DEBOUNCE_MS = 3000

export function AppearanceSettingsClient({ initialSettings }: { initialSettings: UsersAPI.UserSettings.GetMe.Response }) {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const router = useRouter()
  const nextRouter = useNextRouter()
  const pathname = usePathname()
  const setPersistedLocale = useLocalePreferenceStore((s) => s.setLocale)
  const setShaderConfig = useSetShaderConfig()
  const setVariant = useSidebarStore((s) => s.setVariant)
  const setCollapsible = useSidebarStore((s) => s.setCollapsible)
  const initialShader = normalizeUserShaderPreferences(initialSettings.shader)
  const initialSidebar = normalizeUserSidebarPreferences(initialSettings.sidebar)
  const initialLocale = normalizeUserLanguage(initialSettings.language) ?? useLocalePreferenceStore.getState().locale
  const [defaultMuteMic, setDefaultMuteMic] = useState(initialSettings.default_mute_mic ?? false)
  const [defaultDisableCamera, setDefaultDisableCamera] = useState(initialSettings.default_disable_camera ?? false)
  const [shaderType, setShaderType] = useState<ShaderType>(initialShader.type)
  const [shaderPreset, setShaderPreset] = useState<ShaderPresetType>(initialShader.preset)
  const [shaderAnimationEnabled, setShaderAnimationEnabled] = useState<boolean>(!initialShader.disabled)
  const [shaderProps, setShaderProps] = useState<ShaderRenderMap[ShaderType] | undefined>(initialShader.props)
  const [savedShaderProps, setSavedShaderProps] = useState<ShaderRenderMap[ShaderType] | undefined>(initialShader.props)
  const [isSavingShaderDetails, setIsSavingShaderDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'language' | 'shader' | 'video' | 'sidebar'>('language')
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
    setShaderConfig({
      type: shaderType,
      preset: shaderPreset,
      disabled: !shaderAnimationEnabled,
      props: shaderProps,
    })
  }, [setShaderConfig, shaderAnimationEnabled, shaderPreset, shaderProps, shaderType])

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
        disabled: !shaderAnimationEnabled,
        props: savedShaderProps,
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
    savedShaderProps,
    shaderPreset,
    shaderType,
    uiLocaleDraft,
    sidebarVariant,
  ])

  const payload = useMemo<UsersAPI.UserSettings.PatchMe.Body>(() => ({
    default_mute_mic: defaultMuteMic,
    default_disable_camera: defaultDisableCamera,
    language: uiLocaleDraft,
    shader: {
      type: shaderType,
      preset: shaderPreset,
      disabled: !shaderAnimationEnabled,
      props: savedShaderProps,
    },
    sidebar: { variant: sidebarVariant, collapsible: sidebarCollapsible },
  }), [
    sidebarCollapsible,
    defaultDisableCamera,
    defaultMuteMic,
    shaderAnimationEnabled,
    savedShaderProps,
    shaderPreset,
    shaderType,
    uiLocaleDraft,
    sidebarVariant,
  ])

  const hasUnsavedShaderDetails = useMemo(() => {
    return JSON.stringify(shaderProps ?? {}) !== JSON.stringify(savedShaderProps ?? {})
  }, [savedShaderProps, shaderProps])

  const debouncedAutosave = useDebounceCallback(
    (...args: unknown[]) => {
      const [nextPayload] = args as [UsersAPI.UserSettings.PatchMe.Body]
      const payloadKey = JSON.stringify(nextPayload)
      if (payloadKey === lastSavedKeyRef.current || payloadKey === inFlightPayloadKeyRef.current) {
        return
      }
      inFlightPayloadKeyRef.current = payloadKey
      void fetchFromActionRoute<UsersAPI.UserSettings.PatchMe.Response>('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPayload),
      })
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

  const revertShaderDetailsDraft = () => {
    setShaderProps(savedShaderProps)
  }

  const saveShaderDetails = async () => {
    const nextProps = shaderProps
    const nextPropsKey = JSON.stringify(nextProps ?? {})
    const savedPropsKey = JSON.stringify(savedShaderProps ?? {})
    if (nextPropsKey === savedPropsKey) {
      useShaderPreferenceStore.getState().setShader({
        type: shaderType,
        preset: shaderPreset,
        disabled: !shaderAnimationEnabled,
        props: nextProps,
      })
      return
    }
    setIsSavingShaderDetails(true)
    try {
      await fetchFromActionRoute<UsersAPI.UserSettings.PatchMe.Response>('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shader: {
            type: shaderType,
            preset: shaderPreset,
            disabled: !shaderAnimationEnabled,
            props: nextProps,
          },
        } satisfies UsersAPI.UserSettings.PatchMe.Body),
      })
      setSavedShaderProps(nextProps)
      useShaderPreferenceStore.getState().setShader({
        type: shaderType,
        preset: shaderPreset,
        disabled: !shaderAnimationEnabled,
        props: nextProps,
      })
      toast.success(t('appearancePage.updated'))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('appearancePage.updateFailed'))
    } finally {
      setIsSavingShaderDetails(false)
    }
  }

  useEffect(() => {
    const onBeforeUnload = () => {
      useShaderPreferenceStore.getState().setShader({
        type: shaderType,
        preset: shaderPreset,
        disabled: !shaderAnimationEnabled,
        props: savedShaderProps,
      })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [savedShaderProps, shaderAnimationEnabled, shaderPreset, shaderType])

  return (
    <AppLayout label={t('appearancePage.label')} description={t('appearancePage.description')}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value as 'language' | 'shader' | 'video' | 'sidebar'
          if (activeTab === 'shader' && nextTab !== 'shader') {
            revertShaderDetailsDraft()
          }
          setActiveTab(nextTab)
        }}
      >
        <TabsList variant={'line'} className="w-full justify-start overflow-x-auto whitespace-nowrap overflow-y-hidden">
          <TabsTrigger value="language" className="shrink-0">{t('appearancePage.language')}</TabsTrigger>
          <TabsTrigger value="shader" className="shrink-0">{t('appearancePage.shaderSection')}</TabsTrigger>
          <TabsTrigger value="video" className="shrink-0">{t('appearancePage.videoDefaults')}</TabsTrigger>
          <TabsTrigger value="sidebar" className="shrink-0">{t('appearancePage.sidebarSection')}</TabsTrigger>
        </TabsList>
        <TabsContent value="language">
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
        </TabsContent>
        <TabsContent value="shader">
          <ShaderSettings
            shaderType={shaderType}
            shaderPreset={shaderPreset}
            shaderAnimationEnabled={shaderAnimationEnabled}
            setShaderType={(value) => {
              markUserInteracted()
              setShaderType(value)
              setShaderPreset('default')
              setShaderProps(undefined)
              setSavedShaderProps(undefined)
            }}
            setShaderPreset={(value) => {
              markUserInteracted()
              setShaderPreset(value)
            }}
            setShaderAnimationEnabled={(value) => {
              markUserInteracted()
              setShaderAnimationEnabled(value)
            }}
            shaderProps={shaderProps}
            setShaderProp={(key, value) => {
              setShaderProps((prev) => ({
                ...(prev ?? {}),
                [key]: value,
              }))
            }}
            onSaveDetails={saveShaderDetails}
            isSavingDetails={isSavingShaderDetails}
            hasUnsavedDetails={hasUnsavedShaderDetails}
            disabled={false}
          />
        </TabsContent>
        <TabsContent value="video">
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
        </TabsContent>
        <TabsContent value="sidebar">
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
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}
