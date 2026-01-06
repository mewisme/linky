import "@repo/ui/globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { MqttProvider } from "@/components/providers/mqtt";
import { ThemeProvider } from "@/components/providers/theme";
import { Toaster } from "react-hot-toast";
import { UserProvider } from "@/components/providers/user-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Linky",
  description: "Connect with the world",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <UserProvider>
            <MqttProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Toaster />
              </ThemeProvider>
            </MqttProvider>
          </UserProvider>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
