"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DevelopmentStoreState {
  isDevelopmentModeEnabled: boolean;
  setDevelopmentModeEnabled: (enabled: boolean) => void;
}

export const useDevelopmentStore = create<DevelopmentStoreState>()(
  persist(
    (set) => ({
      isDevelopmentModeEnabled: false,
      setDevelopmentModeEnabled: (enabled) => set({ isDevelopmentModeEnabled: enabled }),
    }),
    {
      name: "development-settings",
    }
  )
);
