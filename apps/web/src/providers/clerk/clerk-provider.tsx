"use client";

import { ClerkProvider as NextClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { useLocale } from "next-intl";
import { enUS, viVN } from "@clerk/localizations";

import { absoluteLocalePrefixedUrl, localePrefixedPath } from "@/i18n/locale-path";

import { GoogleOneTapClient } from "./google-one-tap-client";

export function LocaleClerkProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const localization = locale === "vi" ? viVN : enUS;
  const signInUrl = localePrefixedPath(locale, "/sign-in");
  const signUpUrl = localePrefixedPath(locale, "/sign-up");
  const afterSignOutUrl = absoluteLocalePrefixedUrl(locale, "/sign-in");
  return (
    <NextClerkProvider
      localization={localization}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      afterSignOutUrl={afterSignOutUrl}
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