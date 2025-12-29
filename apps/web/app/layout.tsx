import "@repo/ui/globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import { ApiClientProvider } from "@/components/providers/api-client";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme";
import { ToasterProvider } from "@/components/providers/toaster";
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
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ApiClientProvider>
              <UserProvider>
                {children}
                <ToasterProvider />
              </UserProvider>
            </ApiClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
