"use client";

import { QueryClient, QueryClientProvider } from "@ws/ui/internal-lib/react-query";
import { SidebarInset, SidebarProvider } from "@ws/ui/components/animate-ui/components/radix/sidebar";

import { AppHeader } from "@/shared/ui/layouts/header/app/app-header";
import { AppSidebar } from "@/shared/ui/layouts/sidebar/app-sidebar";
import { ChatPanelHost } from "@/features/chat/ui/chat-panel-host";
import { FloatingCallProvider } from "@/features/call/ui/floating-call/floating-call-provider";
import { ReactionOverlay } from "@/features/chat/ui/overlays/reaction-overlay";
import { GlobalCallManager } from "@/providers/call/global-call-manager";
import { ReactionEffectProvider } from "@/providers/realtime/reaction-effect-provider";
import { useCommandMenuStore } from "@/shared/model/command-menu-store";
import { useHotkeys } from 'react-hotkeys-hook';
import { useState } from 'react';

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { open } = useCommandMenuStore();

  useHotkeys("mod+k, slash", (e) => {
    e.preventDefault()
    open()
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ReactionEffectProvider>
        <GlobalCallManager>
          <FloatingCallProvider>
            <SidebarProvider
              style={{
                "--sidebar-width": "20rem",
              } as React.CSSProperties}
              defaultOpen={false}
            >
              <AppSidebar />
              <div className="w-full flex flex-col h-full">
                <SidebarInset className="container mx-auto">
                  <AppHeader />
                  {children}
                </SidebarInset>
              </div>
            </SidebarProvider>
            <ChatPanelHost />
          </FloatingCallProvider>
        </GlobalCallManager>
        <ReactionOverlay />
      </ReactionEffectProvider>
    </QueryClientProvider>
  );
}