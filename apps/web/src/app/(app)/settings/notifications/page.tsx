"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ws/ui/components/ui/card";
import {
  IconBell,
  IconBellOff,
  IconLoader2,
  IconVolume,
} from "@tabler/icons-react";
import { useEffect, useState, useTransition } from "react";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { Label } from "@ws/ui/components/ui/label";
import { Separator } from "@ws/ui/components/ui/separator";
import { Switch } from "@ws/ui/components/ui/switch";
import { toast } from "@ws/ui/components/ui/sonner";
import { trackEvent } from "@/lib/telemetry/events/client";
import { usePushNotifications } from "@/features/notifications/hooks/use-push-notifications";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import { useUserContext } from "@/providers/user/user-provider";

export default function NotificationSettingsPage() {
  const {
    user: { isLoaded, user },
    store: { userSettings },
    state: { updateUserSettings },
  } = useUserContext();
  const { play: playSound } = useSoundWithSettings();

  const {
    isSubscribed,
    permissionState,
    enablePush,
    disablePush,
  } = usePushNotifications();

  const [isPending, startTransition] = useTransition();
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setNotificationSoundEnabled(userSettings.notification_sound_enabled ?? false);
    }
  }, [userSettings]);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  if (!isLoaded || !user) return null;

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateUserSettings({
          notification_sound_enabled: notificationSoundEnabled,
        });
        trackEvent({ name: "settings_updated", properties: { section: "notifications" } });
        playSound("success");
        toast.success("Settings updated successfully");
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update settings"
        );
      }
    });
  };

  const hasChanges =
    userSettings &&
    notificationSoundEnabled !== userSettings.notification_sound_enabled;

  return (
    <AppLayout
      label="Notification Settings"
      description="Manage your notification preferences"
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure how and when you receive notifications
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              In-App Notifications
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="notification-sound"
                  className="flex items-center gap-2"
                >
                  <IconVolume className="size-4" />
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

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Push Notifications
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {isSubscribed ? (
                    <IconBell className="size-4" />
                  ) : (
                    <IconBellOff className="size-4" />
                  )}
                  Browser Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications even when Linky is not open
                </p>
              </div>
              {isSupported && permissionState !== "denied" && (
                <div>
                  {isSubscribed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disablePush}
                      data-testid="disable-push-button"
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={enablePush}
                      data-testid="enable-push-button"
                    >
                      Enable
                    </Button>
                  )}
                </div>
              )}
            </div>

            {!isSupported && (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                data-testid="push-not-supported"
              >
                Push notifications are not supported in this browser.
              </div>
            )}

            {isSupported && permissionState === "denied" && (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                data-testid="push-permission-denied"
              >
                Notification permission was denied. Please enable notifications
                in your browser settings.
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Notification Triggers
            </h3>

            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Streak expiry warnings
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                When someone adds you to favorites
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Level up achievements
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Important announcements
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isPending || !hasChanges}>
              {isPending && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
