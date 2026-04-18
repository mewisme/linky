"use client";

import { isUiLocale, type UiLocale } from "@ws/shared-types";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useRouter, usePathname } from "@/i18n/navigation";

import { useLocalePreferenceStore } from "@/shared/model/locale-preference-store";

export function LocaleSync() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const setLocalePreference = useLocalePreferenceStore((s) => s.setLocale);
  const [hydrated, setHydrated] = useState(false);
  const isFirstLocaleSync = useRef(true);

  useEffect(() => {
    const p = useLocalePreferenceStore.persist;
    if (!p) {
      setHydrated(true);
      return;
    }
    if (p.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return p.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const stored = useLocalePreferenceStore.getState().locale;
    if (isFirstLocaleSync.current) {
      isFirstLocaleSync.current = false;
      if (isUiLocale(stored) && stored !== locale) {
        router.replace(pathname, { locale: stored });
        return;
      }
    }
    setLocalePreference(locale as UiLocale);
  }, [hydrated, locale, pathname, router, setLocalePreference]);

  return null;
}
