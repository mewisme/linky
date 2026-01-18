'use client';

import { ClientSideOptionsProvider } from '@c15t/nextjs/client';
import type { ReactNode } from 'react';
import { gtag } from '@c15t/scripts/google-tag'

export function ConsentManagerClient({ children }: { children: ReactNode }) {
  const gtmId = process.env.NEXT_PUBLIC_GTAG;
  return (
    <ClientSideOptionsProvider
      scripts={[
        gtag({
          id: gtmId as string,
          category: 'measurement'
        }),
      ]}
      callbacks={{
        onConsentSet(response) {
          console.log('Consent updated:', response);
        },
        onError(error) {
          console.error('Consent error:', error);
        },
      }}
    >
      {children}
    </ClientSideOptionsProvider>
  );
}
