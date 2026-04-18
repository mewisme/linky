"use client";

import type { ReactNode } from "react";

import { routing } from "@/i18n/routing";
import en from "@/messages/en.json";
import { NextIntlClientProvider } from "next-intl";

export function RootNextIntlProvider({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={routing.defaultLocale} messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}
