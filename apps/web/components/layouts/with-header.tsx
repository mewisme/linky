'use client';

import { ConnectionStatus } from "@/hooks/use-video-chat-state";
import { Header } from "@/components/header/landing/index";
import { cn } from "@repo/ui/lib/utils";

interface WithHeaderProps {
  children: React.ReactNode;
  connectionStatus?: ConnectionStatus;
}

export function WithHeader({ children, connectionStatus }: WithHeaderProps) {
  return (
    <main className={cn('flex min-h-screen flex-col relative h-dvh')}>
      <Header transition={true} connectionStatus={connectionStatus} />
      <div className="h-dvh w-full flex items-center">
        {children}
      </div>
    </main>
  )
}