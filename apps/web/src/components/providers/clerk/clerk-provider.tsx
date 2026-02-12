import { ClerkProvider as NextClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";

import { GoogleOneTapClient } from "./google-one-tap-client";

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextClerkProvider
      taskUrls={{
        'reset-password': '/reset-password',
      }}
      appearance={{
        theme: shadcn,
      }}
    >
      <GoogleOneTapClient />
      {children}
    </NextClerkProvider>
  );
}