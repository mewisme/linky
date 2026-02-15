'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useCommandMenuStore } from '@/stores/command-menu-store';
import { useHotkeys } from 'react-hotkeys-hook';
import { useState } from 'react';

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { open } = useCommandMenuStore();

  useHotkeys("mod+k, slash", (e) => {
    e.preventDefault()
    open()
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}
