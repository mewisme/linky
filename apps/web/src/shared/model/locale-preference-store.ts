import type { UiLocale } from "@ws/shared-types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocalePreferenceState {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
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
