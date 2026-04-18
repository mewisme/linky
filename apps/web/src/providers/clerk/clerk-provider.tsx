import { ClerkProvider as NextClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import type { LocalizationResource } from "@clerk/shared/types";

import { GoogleOneTapClient } from "./google-one-tap-client";

export function ClerkProvider({ children, localization }: { children: React.ReactNode, localization?: LocalizationResource }) {
  return (
    <NextClerkProvider
      localization={localization}
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