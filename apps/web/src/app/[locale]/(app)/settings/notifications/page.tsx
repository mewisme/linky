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
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/telemetry/events/client";
import { usePushNotifications } from "@/features/notifications/hooks/use-push-notifications";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import { useUserContext } from "@/providers/user/user-provider";

export default function NotificationSettingsPage() {
  const ts = useTranslations("settings.notificationsPage");
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
        toast.success(ts("updated"));
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : ts("updateFailed")
        );
      }
    });
  };

  const hasChanges =
    userSettings &&
    notificationSoundEnabled !== userSettings.notification_sound_enabled;

  return (
    <AppLayout
      label={ts("label")}
      description={ts("description")}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>{ts("cardTitle")}</CardTitle>
          <CardDescription>
            {ts("cardDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {ts("sectionInApp")}
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="notification-sound"
                  className="flex items-center gap-2"
                >
                  <IconVolume className="size-4" />
                  {ts("notificationSound")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {ts("notificationSoundHint")}
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
              {ts("sectionPush")}
            </h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {isSubscribed ? (
                    <IconBell className="size-4" />
                  ) : (
                    <IconBellOff className="size-4" />
                  )}
                  {ts("browserPush")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {ts("browserPushHint")}
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
                      {ts("disable")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={enablePush}
                      data-testid="enable-push-button"
                    >
                      {ts("enable")}
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
                {ts("pushNotSupportedBanner")}
              </div>
            )}

            {isSupported && permissionState === "denied" && (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                data-testid="push-permission-denied"
              >
                {ts("permissionDeniedBanner")}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {ts("sectionTriggers")}
            </h3>

            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {ts("triggerStreak")}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {ts("triggerFavorites")}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {ts("triggerLevelUp")}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {ts("triggerAnnouncements")}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isPending || !hasChanges}>
              {isPending && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              {ts("saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
