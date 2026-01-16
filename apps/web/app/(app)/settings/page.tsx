'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { Separator } from '@repo/ui/components/ui/separator'
import { Switch } from '@repo/ui/components/ui/switch'
import { Label } from '@repo/ui/components/ui/label'
import { Button } from '@repo/ui/components/ui/button'
import { IconLoader2, IconMicrophone, IconVideo, IconBell } from '@tabler/icons-react'
import { AppLayout } from '@/components/layouts/app-layout'
import { useUserContext } from '@/components/providers/user'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const {
    user: { isLoaded, user },
    store: { userSettings },
    state: { updateUserSettings },
  } = useUserContext()

  const [isPending, startTransition] = useTransition()
  const [defaultMuteMic, setDefaultMuteMic] = useState(false)
  const [defaultDisableCamera, setDefaultDisableCamera] = useState(false)
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(false)

  useEffect(() => {
    if (userSettings) {
      setDefaultMuteMic(userSettings.default_mute_mic ?? false)
      setDefaultDisableCamera(userSettings.default_disable_camera ?? false)
      setNotificationSoundEnabled(userSettings.notification_sound_enabled ?? false)
    }
  }, [userSettings])

  if (!isLoaded || !user) return null

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateUserSettings({
          default_mute_mic: defaultMuteMic,
          default_disable_camera: defaultDisableCamera,
          notification_sound_enabled: notificationSoundEnabled,
        })
        toast.success('Settings updated successfully')
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to update settings')
      }
    })
  }

  const hasChanges =
    userSettings &&
    (defaultMuteMic !== userSettings.default_mute_mic ||
      defaultDisableCamera !== userSettings.default_disable_camera ||
      notificationSoundEnabled !== userSettings.notification_sound_enabled)

  return (
    <AppLayout label="Settings" description="Manage your settings">
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Configure your default preferences and notification settings
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Video Chat Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Video Chat Defaults
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mute-mic" className="flex items-center gap-2">
                    <IconMicrophone className="size-4" />
                    Default Mute Microphone
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Microphone will be muted by default when joining a video chat
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
                    Default Disable Camera
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Camera will be disabled by default when joining a video chat
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

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Notifications
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notification-sound" className="flex items-center gap-2">
                  <IconBell className="size-4" />
                  Notification Sound
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable sound notifications for incoming calls and messages
                </p>
              </div>
              <Switch
                id="notification-sound"
                checked={notificationSoundEnabled}
                onCheckedChange={setNotificationSoundEnabled}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={isPending || !hasChanges}
            >
              {isPending && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
