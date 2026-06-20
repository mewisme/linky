import type { AppLocale } from "@/shared/types/app-locale.types";
import { create } from "zustand";

type LocaleChangeGuardState = {
  dialogOpen: boolean;
  pendingLocale: AppLocale | null;
  pendingRun: (() => void | Promise<void>) | null;
  openDialog: (locale: AppLocale, run: () => void | Promise<void>) => void;
  closeDialog: () => void;
  takePendingRun: () => (() => void | Promise<void>) | null;
};

export const useLocaleChangeGuardStore = create<LocaleChangeGuardState>(
  (set, get) => ({
    dialogOpen: false,
    pendingLocale: null,
    pendingRun: null,
    openDialog: (locale, run) =>
      set({ dialogOpen: true, pendingLocale: locale, pendingRun: run }),
    closeDialog: () =>
      set({ dialogOpen: false, pendingLocale: null, pendingRun: null }),
    takePendingRun: () => {
      const run = get().pendingRun;
      set({ dialogOpen: false, pendingLocale: null, pendingRun: null });
      return run;
    },
  }),
);
