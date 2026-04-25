'use client'

import { IconMicrophone, IconVideo } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { Label } from '@ws/ui/components/ui/label'
import { Switch } from '@ws/ui/components/ui/switch'
import { Separator } from '@ws/ui/components/ui/separator'

type Props = {
  defaultMuteMic: boolean
  defaultDisableCamera: boolean
  onDefaultMuteMicChange: (value: boolean) => void
  onDefaultDisableCameraChange: (value: boolean) => void
}

export function VideoDefaultsSettings({
  defaultMuteMic,
  defaultDisableCamera,
  onDefaultMuteMicChange,
  onDefaultDisableCameraChange,
}: Props) {
  const t = useTranslations('settings')

  return (
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
            onCheckedChange={onDefaultMuteMicChange}
            disabled={false}
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
            onCheckedChange={onDefaultDisableCameraChange}
            disabled={false}
          />
        </div>
      </div>
    </div>
  )
}
