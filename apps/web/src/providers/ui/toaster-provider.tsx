"use client";

import { Toaster } from "@ws/ui/components/ui/sonner";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";

export function ToasterProvider() {
  const isMobile = useIsMobile();
  return <Toaster position={isMobile ? "top-center" : "top-right"} />;
}