import "../styles/globals.css";

import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs";
import { ConsentManager } from "@/components/c15t/consent-manager";
import type { Metadata } from "next";
import { MqttProvider } from "@/components/providers/mqtt";
import { Outfit } from "next/font/google";
import ProgressBarProvider from "@/components/providers/progress-bar";
import { SocketProvider } from "@/components/providers/socket-provider";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/components/providers/theme";
import { Toaster } from "@repo/ui/components/ui/sonner";
import { UserProvider } from "@/components/providers/user";

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
      description: "Connecting you everywhere",
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
      description: "Connecting you everywhere",
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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${outfit.className} antialiased`}
        >
          <ConsentManager>
            <UserProvider>
              <SocketProvider>
                <MqttProvider>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                  >
                    <ProgressBarProvider>
                      {children}
                      <Toaster position="top-center" />
                    </ProgressBarProvider>
                  </ThemeProvider>
                </MqttProvider>
              </SocketProvider>
            </UserProvider>
          </ConsentManager>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
