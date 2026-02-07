'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useCommandMenuStore } from '@/stores/command-menu-store';
import { useHotkeys } from 'react-hotkeys-hook';

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
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
