"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@repo/ui/components/animate-ui/components/radix/sidebar";

import { AppHeader } from "@/components/header/app/app-header";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ChatPanelHost } from "@/components/chat/chat-panel-host";
import { FloatingCallProvider } from "@/components/floating-call/floating-call-provider";
import { GlobalCallManager } from "@/components/providers/call/global-call-manager";
import { useCommandMenuStore } from "@/stores/command-menu-store";
import { useHotkeys } from 'react-hotkeys-hook';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  const { open } = useCommandMenuStore();

  useHotkeys("mod+k, slash", (e) => {
    e.preventDefault()
    open()
  })

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}