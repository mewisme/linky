import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";

import { LocaleClerkProvider } from "@/providers/clerk/clerk-provider";
import { ClerkReadyIndicator } from "@/shared/ui/clerk/clerk-ready-indicator";
import { LocaleSync } from "@/providers/i18n/locale-sync";
import ProgressBarProvider from "@/providers/ui/progress-bar-provider";
import { SocketProvider } from "@/providers/realtime/socket-provider";
import { ServiceWorkerUpdateProvider } from "@/providers/ui/service-worker-update-provider";
import { UserProvider } from "@/providers/user/user-provider";
import { routing } from "@/i18n/routing";

type AppLocale = (typeof routing.locales)[number];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: localeParam } = await params;
  if (!routing.locales.includes(localeParam as AppLocale)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
      <LocaleClerkProvider>
      <LocaleSync />
      <ServiceWorkerUpdateProvider />
      <UserProvider>
        <ClerkReadyIndicator />
        <SocketProvider>
          <ProgressBarProvider>{children}</ProgressBarProvider>
        </SocketProvider>
      </UserProvider>
      </LocaleClerkProvider>
    </NextIntlClientProvider>
  );
}
