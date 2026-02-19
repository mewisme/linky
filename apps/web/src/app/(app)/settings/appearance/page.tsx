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
import { useEffect, useState, useTransition } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { Label } from '@ws/ui/components/ui/label'
import { Separator } from '@ws/ui/components/ui/separator'
import { Switch } from '@ws/ui/components/ui/switch'
import { toast } from "@ws/ui/components/ui/sonner";
import { trackEvent } from "@/lib/analytics/events/client";
import { useSidebarStore, type SidebarCollapsible, type SidebarVariant } from '@/stores/sidebar-store'
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'
import { useUserContext } from '@/components/providers/user/user-provider'

function SidebarSettings() {
  const { variant, collapsible, setVariant, setCollapsible } = useSidebarStore();
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Sidebar
      </h3>

      <div className="grid gap-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Label htmlFor="sidebar-variant" className="flex items-center gap-2">
              Sidebar Variant
            </Label>
            <p className="text-sm text-muted-foreground">
              Sidebar layout: attached (sidebar) or floating panel
            </p>
          </div>
          <Select
            value={variant}
            onValueChange={(v) => setVariant(v as SidebarVariant)}
          >
            <SelectTrigger id="sidebar-variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sidebar">Sidebar</SelectItem>
              <SelectItem value="floating">Floating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between">
          <div className="space-y-2">
            <Label htmlFor="sidebar-collapsible" className="flex items-center gap-2">
              Collapse behavior
            </Label>
            <p className="text-sm text-muted-foreground">
              Offcanvas slides off-screen; icon keeps a narrow strip visible
            </p>
          </div>
          <Select
            value={collapsible}
            onValueChange={(c) => setCollapsible(c as SidebarCollapsible)}
          >
            <SelectTrigger id="sidebar-collapsible">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offcanvas">Offcanvas</SelectItem>
              <SelectItem value="icon">Icon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default function AppearanceSettingsPage() {
  const {
    user: { isLoaded, user },
    store: { userSettings },
    state: { updateUserSettings },
  } = useUserContext()
  const { play: playSound } = useSoundWithSettings()

  const [isPending, startTransition] = useTransition()
  const [defaultMuteMic, setDefaultMuteMic] = useState(false)
  const [defaultDisableCamera, setDefaultDisableCamera] = useState(false)

  useEffect(() => {
    if (userSettings) {
      setDefaultMuteMic(userSettings.default_mute_mic ?? false)
      setDefaultDisableCamera(userSettings.default_disable_camera ?? false)
    }
  }, [userSettings])

  if (!isLoaded || !user) return null

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateUserSettings({
          default_mute_mic: defaultMuteMic,
          default_disable_camera: defaultDisableCamera,
        });
        trackEvent({ name: "settings_updated", properties: { section: "appearance" } });
        playSound('success')
        toast.success('Settings updated successfully')
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to update settings')
      }
    })
  }

  const hasChanges =
    userSettings &&
    (defaultMuteMic !== userSettings.default_mute_mic ||
      defaultDisableCamera !== userSettings.default_disable_camera)

  return (
    <AppLayout label="Appearance Settings" description="Manage your appearance settings" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Appearance Settings</CardTitle>
          <CardDescription>
            Configure your default preferences and appearance settings
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
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

          <SidebarSettings />

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
