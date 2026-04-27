'use client';

import { useEffect, type ReactNode } from 'react';
import { ShaderConfigProvider } from '@ws/ui/components/mew-ui/shader';
import { useShaderPreferenceStore } from '@/shared/model/shader-preference-store';

type Props = {
  children: ReactNode;
};

export function AppShaderConfigProvider({ children }: Props) {
  const type = useShaderPreferenceStore((state) => state.type);
  const preset = useShaderPreferenceStore((state) => state.preset);
  const disabled = useShaderPreferenceStore((state) => state.disabled);
  const shaderProps = useShaderPreferenceStore((state) => state.props);
  const setShader = useShaderPreferenceStore((state) => state.setShader);

  useEffect(() => {
    useShaderPreferenceStore.persist.rehydrate();
  }, []);

  return (
    <ShaderConfigProvider
      value={{
        type,
        preset,
        disabled,
        props: shaderProps,
      }}
      onChange={(nextValue) => {
        setShader({
          type: nextValue.type,
          preset: nextValue.preset,
          disabled: nextValue.disabled,
          props: nextValue.props,
        });
      }}
    >
      {children}
    </ShaderConfigProvider>
  );
}
