'use client'

import { QueryClient, QueryClientProvider } from '@ws/ui/internal-lib/react-query'

import { useCommandMenuStore } from '@/shared/model/command-menu-store';
import { useHotkeys } from 'react-hotkeys-hook';
import { useState } from 'react';

const queryClientDefaultOptions = {
  defaultOptions: {
    queries: {
      gcTime: 10 * 60 * 1000,
    },
  },
} as const;

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(queryClientDefaultOptions));
  const { open } = useCommandMenuStore();

  useHotkeys("mod+k, slash", (e) => {
    e.preventDefault()
    open()
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
