"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@repo/ui/components/animate-ui/components/radix/sidebar";

import { AppHeader } from "@/components/header/app/app-header";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { FloatingCallProvider } from "@/components/floating-call/floating-call-provider";
import { GlobalCallManager } from "@/components/providers/call/global-call-manager";
import { Suspense } from "react";
import { usePageView } from "@/hooks/ui/use-page-view";
import { useVisitorTracking } from "@/hooks/analytics/use-visitor-tracking";

function VisitorTracker() {
  usePageView();
  useVisitorTracking();
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
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
                <Suspense fallback={null}>
                  <VisitorTracker />
                </Suspense>
                {children}
              </SidebarInset>
            </div>
          </SidebarProvider>
        </FloatingCallProvider>
      </GlobalCallManager>
    </QueryClientProvider>
  );
}