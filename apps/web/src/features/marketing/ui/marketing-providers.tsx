'use client'

import { useCommandMenuStore } from '@/shared/model/command-menu-store';
import { useHotkeys } from 'react-hotkeys-hook';

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  const { open } = useCommandMenuStore();

  useHotkeys("mod+k, slash", (e) => {
    e.preventDefault()
    open()
  })

  return children
}
