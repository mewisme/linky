"use client";

import type { ReactNode } from "react";

import { GlobalCallManager } from "@/providers/call/global-call-manager";

export function LocaleTreeCallManager({ children }: { children: ReactNode }) {
  return <GlobalCallManager>{children}</GlobalCallManager>;
}
