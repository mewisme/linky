import "@/styles/globals.css";

import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@/components/providers/clerk/clerk-provider";
import { ClerkReadyIndicator } from "@/components/clerk/clerk-ready-indicator";
import { HideDevelopmentMode } from "@/components/clerk/hide-development-mode";
import type { Metadata } from "next";
import { MqttProvider } from "@/components/providers/realtime/mqtt-provider";
import { OpenPanelComponent } from "@openpanel/nextjs";
import { Outfit } from "next/font/google";
import ProgressBarProvider from "@/components/providers/ui/progress-bar-provider";
import { SocketProvider } from "@/components/providers/realtime/socket-provider";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/components/providers/ui/theme-provider";
import { Toaster } from "@ws/ui/components/ui/sonner";
import { UserProvider } from "@/components/providers/user/user-provider";

const outfit = Outfit({
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
  }
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
              <UserProvider>
                <ClerkReadyIndicator />
                <SocketProvider>
                  <MqttProvider>
                    <ProgressBarProvider>
                      {children}
                      <Toaster position="top-center" />
                    </ProgressBarProvider>
                  </MqttProvider>
                </SocketProvider>
              </UserProvider>
            </ThemeProvider>
            <Analytics />
            <SpeedInsights />
            <OpenPanelComponent
              apiUrl={process.env.NEXT_PUBLIC_OPENPANEL_API_URL as string}
              clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID as string}
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
