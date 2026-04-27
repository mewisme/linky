import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ShaderPresetType,
  ShaderRenderMap,
  ShaderType,
} from "@ws/ui/components/mew-ui/shader";
import {
  getDefaultShaderPreferences,
  normalizeUserShaderPreferences,
} from '@/entities/user/lib'

interface ShaderPreferenceState {
  type: ShaderType;
  preset: ShaderPresetType;
  disabled: boolean;
  props?: ShaderRenderMap[ShaderType];
  setShader: (shader: {
    type: ShaderType;
    preset: ShaderPresetType;
    disabled: boolean;
    props?: ShaderRenderMap[ShaderType];
  }) => void;
  setFromUnknown: (value: unknown) => void;
}

const defaults = getDefaultShaderPreferences();

export const useShaderPreferenceStore = create<ShaderPreferenceState>()(
  persist(
    (set) => ({
      type: defaults.type,
      preset: defaults.preset,
      disabled: defaults.disabled,
      props: defaults.props,
      setShader: (shader) => set({
        type: shader.type,
        preset: shader.preset,
        disabled: shader.disabled,
        props: shader.props,
      }),
      setFromUnknown: (value) => {
        const normalized = normalizeUserShaderPreferences(value);
        set({
          type: normalized.type,
          preset: normalized.preset,
          disabled: normalized.disabled,
          props: normalized.props,
        });
      },
    }),
    {
      name: "shader-preferences",
      skipHydration: true,
    },
  ),
);
