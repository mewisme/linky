import "@/shared/styles/globals.css";

import { Analytics } from "@vercel/analytics/next"
import { HideDevelopmentMode } from "@/shared/ui/clerk/hide-development-mode";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { OpenPanelComponent } from "@openpanel/nextjs";
import { beVietnamPro } from "@/shared/fonts/be-vietnam-pro";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { RootNextIntlProvider } from "@/providers/i18n/root-next-intl-provider";
import { ThemeProvider } from "@/providers/ui/theme-provider";
import { ToasterProvider } from "@/providers/ui/toaster-provider";
import { publicEnv } from "@/shared/env/public-env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const tMarketing = await getTranslations("marketing");
  const locale = await getLocale();
  const ogLocale = locale === "vi" ? "vi_VN" : "en_US";
  const appUrl = publicEnv.APP_URL;
  const keywords = tMarketing.raw("layout.keywords") as string[];
  return {
    title: t("common.appName"),
    description: t("common.tagline"),
    keywords,
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
      description: t("marketing.layout.description"),
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
      locale: ogLocale,
      countryName: "Vietnam",
    },
    twitter: {
      card: "summary_large_image",
      title: t("common.appName"),
      description: t("marketing.layout.description"),
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

  return (
    <HideDevelopmentMode>
      <html lang={locale} suppressHydrationWarning>
        <body
          className={`${beVietnamPro.className} antialiased`}
        >
          <RootNextIntlProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ToasterProvider />
              {children}
            </ThemeProvider>
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
          </RootNextIntlProvider>
        </body>
      </html>
    </HideDevelopmentMode>
  );
}
