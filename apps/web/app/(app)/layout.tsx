"use client";

import { SidebarInset, SidebarProvider } from "@repo/ui/components/animate-ui/components/radix/sidebar";

import { AppHeader } from "@/components/header/app/app-header";
import { AppSidebar } from "@/components/sidebar";
import { usePageView } from "@/hooks/use-page-view";
import { useVisitorTracking } from "@/hooks/use-visitor-tracking";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useVisitorTracking();
  usePageView();

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="w-full flex flex-col h-full">
        <SidebarInset className="container mx-auto">
          <AppHeader />
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}