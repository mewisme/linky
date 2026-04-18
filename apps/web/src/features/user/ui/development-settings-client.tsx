"use client";

import { useEffect, useState } from "react";
import { IconCode } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("settings.developmentPage");
  const tc = useTranslations("common");
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
      label={t("label")}
      description={t("description")}
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <CardDescription>
            {t("cardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="development-mode" className="flex items-center gap-2">
                <IconCode className="size-4" />
                {t("enableLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("enableHint")}
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
            <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEnable}>
              {t("dialogConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
