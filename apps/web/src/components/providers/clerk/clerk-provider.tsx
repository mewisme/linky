"use client";

import { ClerkProvider as NextClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <NextClerkProvider appearance={{
      theme: theme === "dark" ? dark : undefined,
    }}>
      {children}
    </NextClerkProvider>
  );
}