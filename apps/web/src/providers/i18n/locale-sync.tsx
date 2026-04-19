"use client";

import { isUiLocale, type UiLocale } from "@ws/shared-types";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { isVideoChatBlockingLocaleChange } from "@/features/call/lib/video-chat-locale-block";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useRouter, usePathname } from "@/i18n/navigation";

import { useLocalePreferenceStore } from "@/shared/model/locale-preference-store";

export function LocaleSync() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const setLocalePreference = useLocalePreferenceStore((s) => s.setLocale);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const [hydrated, setHydrated] = useState(false);
  const isFirstLocaleSync = useRef(true);
  const deferredRedirectLocale = useRef<UiLocale | null>(null);

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
    if (!isFirstLocaleSync.current) return;
    isFirstLocaleSync.current = false;

    const stored = useLocalePreferenceStore.getState().locale;
    if (!isUiLocale(stored) || stored === locale) return;

    if (isVideoChatBlockingLocaleChange(useVideoChatStore.getState().connectionStatus)) {
      deferredRedirectLocale.current = stored;
      return;
    }
    router.replace(pathname, { locale: stored });
  }, [hydrated, locale, pathname, router]);

  useEffect(() => {
    if (!hydrated) return;
    const def = deferredRedirectLocale.current;
    if (!def) return;
    if (isVideoChatBlockingLocaleChange(connectionStatus)) return;
    if (def === locale) {
      deferredRedirectLocale.current = null;
      return;
    }
    deferredRedirectLocale.current = null;
    router.replace(pathname, { locale: def });
  }, [hydrated, connectionStatus, locale, pathname, router]);

  useEffect(() => {
    if (!hydrated) return;
    if (deferredRedirectLocale.current) return;
    setLocalePreference(locale as UiLocale);
  }, [hydrated, locale, setLocalePreference]);

  return null;
}
