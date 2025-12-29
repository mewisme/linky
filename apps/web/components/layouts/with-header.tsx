'use client';

import { Header } from "@/components/header/index";
import { cn } from "@repo/ui/lib/utils";

export function WithHeader({ children }: { children: React.ReactNode }) {
  return (
    <main className={cn('flex min-h-screen flex-col relative h-dvh')}>
      <Header transition={true} />
      <div className="h-dvh w-full flex items-center">
        {children}
      </div>
    </main>
  )
}