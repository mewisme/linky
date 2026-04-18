"use client";

import { ClerkProvider as NextClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { useLocale } from "next-intl";
import { enUS, viVN } from "@clerk/localizations";

import { localePrefixedPath } from "@/i18n/locale-path";

import { GoogleOneTapClient } from "./google-one-tap-client";

export function LocaleClerkProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const localization = locale === "vi" ? viVN : enUS;
  const signInUrl = localePrefixedPath(locale, "/sign-in");
  const signUpUrl = localePrefixedPath(locale, "/sign-up");
  return (
    <NextClerkProvider
      localization={localization}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      taskUrls={{
        "reset-password": localePrefixedPath(locale, "/reset-password"),
      }}
      appearance={{
        theme: shadcn,
      }}
    >
      <GoogleOneTapClient />
      {children}
    </NextClerkProvider>
  );
}