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
import { IconLoader2, IconMicrophone, IconVideo } from '@tabler/icons-react'
import type { UiLocale } from '@ws/shared-types'
import { useTranslations } from 'next-intl'
import { useRouter as useNextRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { Label } from '@ws/ui/components/ui/label'
import { Separator } from '@ws/ui/components/ui/separator'
import { Switch } from '@ws/ui/components/ui/switch'
import { toast } from '@ws/ui/components/ui/sonner'
import { trackEvent } from '@/lib/telemetry/events/client'
import { updateUserSettings } from "@/features/user/api/settings";
import { useSidebarStore, type SidebarCollapsible, type SidebarVariant } from '@/shared/model/sidebar-store'
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { useUserStore } from '@/entities/user/model/user-store'
import { useLocalePreferenceStore } from '@/shared/model/locale-preference-store'
import type { UsersAPI } from '@/entities/user/types/users.types'

function SidebarSettings() {
  const t = useTranslations('settings')
  const { variant, collapsible, setVariant, setCollapsible } = useSidebarStore()
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t('appearancePage.sidebarSection')}
      </h3>
      <div className="grid gap-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Label htmlFor="sidebar-variant" className="flex items-center gap-2">
              {t('appearancePage.sidebarVariant')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('appearancePage.sidebarVariantHint')}
            </p>
          </div>
          <Select value={variant} onValueChange={(v) => setVariant(v as SidebarVariant)}>
            <SelectTrigger id="sidebar-variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sidebar">{t('appearancePage.sidebarVariantSidebar')}</SelectItem>
              <SelectItem value="floating">{t('appearancePage.sidebarVariantFloating')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between">
          <div className="space-y-2">
            <Label htmlFor="sidebar-collapsible" className="flex items-center gap-2">
              {t('appearancePage.sidebarCollapsible')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('appearancePage.sidebarCollapsibleHint')}
            </p>
          </div>
          <Select value={collapsible} onValueChange={(c) => setCollapsible(c as SidebarCollapsible)}>
            <SelectTrigger id="sidebar-collapsible">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offcanvas">{t('appearancePage.sidebarCollapsibleOffcanvas')}</SelectItem>
              <SelectItem value="icon">{t('appearancePage.sidebarCollapsibleIcon')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

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
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [defaultMuteMic, setDefaultMuteMic] = useState(initialSettings.default_mute_mic ?? false)
  const [defaultDisableCamera, setDefaultDisableCamera] = useState(initialSettings.default_disable_camera ?? false)
  const [uiLocaleDraft, setUiLocaleDraft] = useState<UiLocale>(
    () => useLocalePreferenceStore.getState().locale,
  )
  const [baseline, setBaseline] = useState(() => ({
    mute: initialSettings.default_mute_mic ?? false,
    camera: initialSettings.default_disable_camera ?? false,
    locale: useLocalePreferenceStore.getState().locale,
  }))

  useEffect(() => {
    const applyStoredLocale = () => {
      const l = useLocalePreferenceStore.getState().locale
      setUiLocaleDraft(l)
      setBaseline((b) => ({ ...b, locale: l }))
    }
    if (useLocalePreferenceStore.persist.hasHydrated()) {
      applyStoredLocale()
    }
    return useLocalePreferenceStore.persist.onFinishHydration(applyStoredLocale)
  }, [])

  const hasChanges =
    defaultMuteMic !== baseline.mute ||
    defaultDisableCamera !== baseline.camera ||
    uiLocaleDraft !== baseline.locale

  const handleSave = () => {
    startTransition(async () => {
      try {
        const micCamChanged =
          defaultMuteMic !== baseline.mute || defaultDisableCamera !== baseline.camera
        const localeChanged = uiLocaleDraft !== baseline.locale

        if (micCamChanged) {
          const updated = await updateUserSettings({
            default_mute_mic: defaultMuteMic,
            default_disable_camera: defaultDisableCamera,
          })
          useUserStore.getState().setUserSettings(updated)
          setBaseline((prev) => ({
            ...prev,
            mute: updated.default_mute_mic ?? false,
            camera: updated.default_disable_camera ?? false,
          }))
          setDefaultMuteMic(updated.default_mute_mic ?? false)
          setDefaultDisableCamera(updated.default_disable_camera ?? false)
        }

        if (localeChanged) {
          setPersistedLocale(uiLocaleDraft)
          router.replace(pathname, { locale: uiLocaleDraft })
          nextRouter.refresh()
          setBaseline((prev) => ({ ...prev, locale: uiLocaleDraft }))
        }

        trackEvent({ name: 'settings_updated', properties: { section: 'appearance' } })
        playSound('success')
        toast.success(t('appearancePage.updated'))
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : t('appearancePage.updateFailed'))
      }
    })
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
                if (value === 'en' || value === 'vi') setUiLocaleDraft(value)
              }}
              disabled={isPending}
            >
              <SelectTrigger id="ui-locale" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{tc('english')}</SelectItem>
                <SelectItem value="vi">{tc('vietnamese')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('appearancePage.videoDefaults')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mute-mic" className="flex items-center gap-2">
                    <IconMicrophone className="size-4" />
                    {t('appearancePage.defaultMute')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('appearancePage.defaultMuteHint')}
                  </p>
                </div>
                <Switch
                  id="mute-mic"
                  checked={defaultMuteMic}
                  onCheckedChange={setDefaultMuteMic}
                  disabled={isPending}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="disable-camera" className="flex items-center gap-2">
                    <IconVideo className="size-4" />
                    {t('appearancePage.defaultCameraOff')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('appearancePage.defaultCameraOffHint')}
                  </p>
                </div>
                <Switch
                  id="disable-camera"
                  checked={defaultDisableCamera}
                  onCheckedChange={setDefaultDisableCamera}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
          <Separator />
          <SidebarSettings />
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isPending || !hasChanges}>
              {isPending && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              {t('appearancePage.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
