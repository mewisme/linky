import "@/shared/styles/globals.css";

import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@/providers/clerk/clerk-provider";
import { ClerkReadyIndicator } from "@/shared/ui/clerk/clerk-ready-indicator";
import { HideDevelopmentMode } from "@/shared/ui/clerk/hide-development-mode";
import type { Metadata } from "next";
import { OpenPanelComponent } from "@openpanel/nextjs";
import { Outfit } from "next/font/google";
import ProgressBarProvider from "@/providers/ui/progress-bar-provider";
import { SocketProvider } from "@/providers/realtime/socket-provider";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/providers/ui/theme-provider";
import { ServiceWorkerUpdateProvider } from "@/providers/ui/service-worker-update-provider";
import { ToasterProvider } from "@/providers/ui/toaster-provider";
import { UserProvider } from "@/providers/user/user-provider";
import { publicEnv } from "@/shared/env/public-env";

const outfit = Outfit({
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = publicEnv.APP_URL;
  return {
    title: "Linky",
    description: "Connecting you everywhere",
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
      title: "Linky",
      description: "Meet new people, make friends, and have fun!",
      url: appUrl,
      images: [
        {
          url: '/og',
          width: 192,
          height: 192,
        },
      ],
      type: "website",
      siteName: "Linky",
      locale: "vi_VN",
      countryName: "Vietnam",
    },
    twitter: {
      card: "summary_large_image",
      title: "Linky",
      description: "Meet new people, make friends, and have fun!",
      images: ["/og"],
    },
    appleWebApp: {
      capable: true,
      title: "Linky",
      statusBarStyle: "black-translucent",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <HideDevelopmentMode>
      <ClerkProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${outfit.className} antialiased`}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ServiceWorkerUpdateProvider />
              <ToasterProvider />
              <UserProvider>
                <ClerkReadyIndicator />
                <SocketProvider>
                  <ProgressBarProvider>
                    {children}
                  </ProgressBarProvider>
                </SocketProvider>
              </UserProvider>
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
          </body>
        </html>
      </ClerkProvider>
    </HideDevelopmentMode>
  );
}
