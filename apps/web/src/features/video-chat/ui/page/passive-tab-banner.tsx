"use client";

import { IconDeviceDesktop } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

export function PassiveTabBanner() {
  const t = useTranslations("call.passiveTab");
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-muted/50 p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <IconDeviceDesktop className="size-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          {t("footerHint")}
        </p>
      </div>
    </div>
  );
}
