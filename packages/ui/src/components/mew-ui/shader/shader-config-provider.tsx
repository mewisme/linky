'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { ShaderPresetType, ShaderRenderMap, ShaderType } from './types';

export type ShaderConfig = {
  type: ShaderType;
  preset: ShaderPresetType;
  disabled: boolean;
  props?: ShaderRenderMap[ShaderType];
};

type ShaderConfigContextValue = {
  config: ShaderConfig;
  setConfig: Dispatch<SetStateAction<ShaderConfig>>;
};

const defaultShaderConfig: ShaderConfig = {
  type: 'liquid-metal',
  preset: 'default',
  disabled: false,
};

const ShaderConfigContext = createContext<ShaderConfigContextValue | null>(null);

type ShaderConfigProviderProps = {
  children: ReactNode;
  defaultValue?: ShaderConfig;
  value?: ShaderConfig;
  onChange?: (nextValue: ShaderConfig) => void;
};

export function ShaderConfigProvider({
  children,
  defaultValue,
  value,
  onChange,
}: ShaderConfigProviderProps) {
  const [internalValue, setInternalValue] = useState<ShaderConfig>(
    defaultValue ?? defaultShaderConfig
  );

  const isControlled = value !== undefined;
  const config = isControlled ? value : internalValue;

  const setConfig: Dispatch<SetStateAction<ShaderConfig>> = (next) => {
    const nextValue =
      typeof next === 'function'
        ? (next as (previous: ShaderConfig) => ShaderConfig)(config)
        : next;

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  };

  const contextValue = useMemo(
    () => ({
      config,
      setConfig,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  );

  return (
    <ShaderConfigContext.Provider value={contextValue}>
      {children}
    </ShaderConfigContext.Provider>
  );
}

function useShaderConfigContext() {
  return useContext(ShaderConfigContext);
}

export function useShaderConfig() {
  const context = useShaderConfigContext();
  return context?.config ?? defaultShaderConfig;
}

export function useSetShaderConfig() {
  const context = useShaderConfigContext();
  return context?.setConfig ?? (() => undefined);
}
