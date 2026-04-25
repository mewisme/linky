"use client";

import { useEffect } from "react";
import { useShaderPreferenceStore } from "@/shared/model/shader-preference-store";

export function useShaderPreference() {
  const type = useShaderPreferenceStore((s) => s.type);
  const preset = useShaderPreferenceStore((s) => s.preset);
  const disableAnimation = useShaderPreferenceStore((s) => s.disableAnimation);

  useEffect(() => {
    void Promise.resolve(useShaderPreferenceStore.persist.rehydrate());
  }, []);

  return { type, preset, disableAnimation };
}
