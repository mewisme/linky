import { GoogleOneTap, ClerkProvider as NextClerkProvider } from "@clerk/nextjs";

import { shadcn } from "@clerk/themes";

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
      <GoogleOneTap />
      {children}
    </NextClerkProvider>
  );
}