"use client";

import type { AppLocale } from "@/shared/types/app-locale.types";
import { useRouter as useNextRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback } from "react";

import { isVideoChatBlockingLocaleChange } from "@/features/video-chat/lib/video-chat-locale-block";
import { useVideoChatStore } from "@/features/video-chat/model/video-chat-store";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocaleChangeGuardStore } from "@/shared/model/locale-change-guard-store";
import { useLocalePreferenceStore } from "@/shared/model/locale-preference-store";

export function useLocaleSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const nextRouter = useNextRouter();
  const locale = useLocale();
  const setPersistedLocale = useLocalePreferenceStore((s) => s.setLocale);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);

  const executeSwitch = useCallback(
    (next: AppLocale) => {
      setPersistedLocale(next);
      router.replace(pathname, { locale: next });
      nextRouter.refresh();
    },
    [setPersistedLocale, router, pathname, nextRouter],
  );

  const switchLocale = useCallback(
    (next: AppLocale) => {
      if (next === locale) return;
      if (isVideoChatBlockingLocaleChange(connectionStatus)) {
        useLocaleChangeGuardStore
          .getState()
          .openDialog(next, () => executeSwitch(next));
        return;
      }
      executeSwitch(next);
    },
    [locale, connectionStatus, executeSwitch],
  );

  return { switchLocale, executeSwitch };
}
