import "@/shared/styles/globals.css";

import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@/providers/clerk/clerk-provider";
import { HideDevelopmentMode } from "@/shared/ui/clerk/hide-development-mode";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { OpenPanelComponent } from "@openpanel/nextjs";
import { Outfit } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/providers/ui/theme-provider";
import { ToasterProvider } from "@/providers/ui/toaster-provider";
import { publicEnv } from "@/shared/env/public-env";

const outfit = Outfit({
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const appUrl = publicEnv.APP_URL;
  return {
    title: t("common.appName"),
    description: t("common.tagline"),
    keywords: ["linky", "chat", "video", "call", "connect", "world"],
    authors: [{ name: "Mew", url: "https://mewis.me" }],
    metadataBase: new URL(appUrl),
    icons: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        url: '/apple-touch-icon.png',
      },
    ],
    creator: "Mew",
    publisher: "Mew",
    openGraph: {
      title: t("common.appName"),
      description: t("marketing.heroTitle"),
      url: appUrl,
      images: [
        {
          url: '/og',
          width: 192,
          height: 192,
        },
      ],
      type: "website",
      siteName: t("common.appName"),
      locale: "vi_VN",
      countryName: "Vietnam",
    },
    twitter: {
      card: "summary_large_image",
      title: t("common.appName"),
      description: t("marketing.heroTitle"),
      images: ["/og"],
    },
    appleWebApp: {
      capable: true,
      title: t("common.appName"),
      statusBarStyle: "black-translucent",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <HideDevelopmentMode>
      <ClerkProvider>
        <html lang={locale} suppressHydrationWarning>
          <body
            className={`${outfit.className} antialiased`}
          >
            <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ToasterProvider />
              {children}
            </ThemeProvider>
            </NextIntlClientProvider>
            <Analytics />
            <SpeedInsights />
            <OpenPanelComponent
              apiUrl="/api/op"
              scriptUrl="/api/op/op1.js"
              clientId={publicEnv.OPENPANEL_CLIENT_ID}
              trackAttributes={true}
              trackScreenViews={true}
              trackOutgoingLinks={true}
              trackHashChanges={true}
            />
          </body>
        </html>
      </ClerkProvider>
    </HideDevelopmentMode>
  );
}
