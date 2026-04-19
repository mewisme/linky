"use client";

import { QueryClient, QueryClientProvider } from "@ws/ui/internal-lib/react-query";
import { useState, type ReactNode } from "react";

import { LocaleTreeCallManager } from "@/providers/call/locale-tree-call-manager";

export function LocaleQueryCallShell({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleTreeCallManager>{children}</LocaleTreeCallManager>
    </QueryClientProvider>
  );
}
