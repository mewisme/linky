import type { AppLocale } from "@/shared/types/app-locale.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocalePreferenceState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useLocalePreferenceStore = create<LocalePreferenceState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "linky-ui-locale" },
  ),
);
