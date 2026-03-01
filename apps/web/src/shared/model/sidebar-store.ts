import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarVariant = 'sidebar' | 'floating';
export type SidebarCollapsible = 'offcanvas' | 'icon';

interface SidebarState {
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
  setVariant: (v: SidebarVariant) => void;
  setCollapsible: (c: SidebarCollapsible) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      variant: 'sidebar',
      collapsible: 'offcanvas',
      setVariant: (v) => set({ variant: v }),
      setCollapsible: (c) => set({ collapsible: c }),
    }),
    { name: 'sidebar-settings', skipHydration: true }
  )
);
