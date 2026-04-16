"use client";

import { useEffect, useState } from "react";
import { IconCode } from "@tabler/icons-react";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { useDevelopmentStore } from "@/shared/model/development-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ws/ui/components/ui/card";
import { Label } from "@ws/ui/components/ui/label";
import { Switch } from "@ws/ui/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ws/ui/components/animate-ui/components/radix/alert-dialog";

export function DevelopmentSettingsClient() {
  const isDevelopmentModeEnabled = useDevelopmentStore(
    (state) => state.isDevelopmentModeEnabled
  );
  const setDevelopmentModeEnabled = useDevelopmentStore(
    (state) => state.setDevelopmentModeEnabled
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [isEnableDialogOpen, setIsEnableDialogOpen] = useState(false);

  useEffect(() => {
    void Promise.resolve(useDevelopmentStore.persist.rehydrate()).then(() => {
      setIsHydrated(true);
    });
  }, []);

  const handleDevelopmentModeChange = (checked: boolean) => {
    if (checked && !isDevelopmentModeEnabled) {
      setIsEnableDialogOpen(true);
      return;
    }

    setDevelopmentModeEnabled(checked);
  };

  const handleConfirmEnable = () => {
    setDevelopmentModeEnabled(true);
    setIsEnableDialogOpen(false);
  };

  return (
    <AppLayout
      label="Development"
      description="Manage local development preferences for this browser"
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Development</CardTitle>
          <CardDescription>
            This setting is saved locally in your browser and is not tied to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="development-mode" className="flex items-center gap-2">
                <IconCode className="size-4" />
                Enable Development Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn on development-only behaviors wherever this flag is used.
              </p>
            </div>
            <Switch
              id="development-mode"
              checked={isDevelopmentModeEnabled}
              onCheckedChange={handleDevelopmentModeChange}
              disabled={!isHydrated}
            />
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={isEnableDialogOpen} onOpenChange={setIsEnableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Development Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Development mode can expose experimental features and diagnostics that are not intended
              for regular usage. Only enable this if you understand the security risks and trust this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEnable}>
              I Understand, Enable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
