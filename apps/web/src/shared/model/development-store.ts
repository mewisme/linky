"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DevelopmentStoreState {
  isDevelopmentModeEnabled: boolean;
  overlayPosition: { x: number; y: number } | null;
  setDevelopmentModeEnabled: (enabled: boolean) => void;
  setOverlayPosition: (position: { x: number; y: number } | null) => void;
  resetOverlayPosition: () => void;
}

export const useDevelopmentStore = create<DevelopmentStoreState>()(
  persist(
    (set) => ({
      isDevelopmentModeEnabled: false,
      overlayPosition: null,
      setDevelopmentModeEnabled: (enabled) => set({ isDevelopmentModeEnabled: enabled }),
      setOverlayPosition: (position) => set({ overlayPosition: position }),
      resetOverlayPosition: () => set({ overlayPosition: null }),
    }),
    {
      name: "development-settings",
    }
  )
);
