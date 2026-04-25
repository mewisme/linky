import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShaderPresetType, ShaderType } from "@ws/ui/components/mew-ui/shader";
import {
  getDefaultShaderPreferences,
  normalizeUserShaderPreferences,
} from '@/entities/user/lib'

interface ShaderPreferenceState {
  type: ShaderType;
  preset: ShaderPresetType;
  disableAnimation: boolean;
  setShader: (shader: { type: ShaderType; preset: ShaderPresetType; disableAnimation: boolean }) => void;
  setFromUnknown: (value: unknown) => void;
}

const defaults = getDefaultShaderPreferences();

export const useShaderPreferenceStore = create<ShaderPreferenceState>()(
  persist(
    (set) => ({
      type: defaults.type,
      preset: defaults.preset,
      disableAnimation: defaults.disableAnimation,
      setShader: (shader) => set({
        type: shader.type,
        preset: shader.preset,
        disableAnimation: shader.disableAnimation,
      }),
      setFromUnknown: (value) => {
        const normalized = normalizeUserShaderPreferences(value);
        set({
          type: normalized.type,
          preset: normalized.preset,
          disableAnimation: normalized.disableAnimation,
        });
      },
    }),
    {
      name: "shader-preferences",
      skipHydration: true,
    },
  ),
);
