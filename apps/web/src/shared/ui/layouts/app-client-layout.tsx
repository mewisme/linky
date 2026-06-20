"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@ws/ui/components/animate-ui/components/radix/sidebar";

import { AppHeader } from "@/shared/ui/layouts/header/app/app-header";
import { AppSidebar } from "@/shared/ui/layouts/sidebar/app-sidebar";
import { ChatPanelHost } from "@/features/video-chat/ui/messaging/chat-panel-host";
import { FloatingCallProvider } from "@/features/video-chat/ui/floating-call/floating-call-provider";
import { ReactionOverlay } from "@/features/video-chat/ui/overlays/reaction-overlay";
import { DevOverlay } from "@/features/development/ui/dev-overlay";
import { ReactionEffectProvider } from "@/providers/realtime/reaction-effect-provider";
import { useCommandMenuStore } from "@/shared/model/command-menu-store";
import { useHotkeys } from "react-hotkeys-hook";
import { ScrollArea } from "@ws/ui/components/ui/scroll-area";

export function AppClientLayout({ children }: { children: React.ReactNode }) {
  const { open } = useCommandMenuStore();

  useHotkeys("mod+k, slash", (e) => {
    e.preventDefault();
    open();
  });

  return (
    <ReactionEffectProvider>
      <FloatingCallProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "20rem",
            } as React.CSSProperties
          }
          defaultOpen={false}
          className="h-screen overflow-hidden"
        >
          <AppSidebar />
          <div className="w-full flex flex-col h-full">
            <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AppHeader />

              <main className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  {children}
                </ScrollArea>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
        <ChatPanelHost />
      </FloatingCallProvider>
      <ReactionOverlay />
      <DevOverlay />
    </ReactionEffectProvider>
  );
}
