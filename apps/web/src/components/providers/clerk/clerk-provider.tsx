import { GoogleOneTap, ClerkProvider as NextClerkProvider } from "@clerk/nextjs";

import { dark } from "@clerk/themes";

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextClerkProvider appearance={{
      theme: dark,
    }}>
      <GoogleOneTap />
      {children}
    </NextClerkProvider>
  );
}