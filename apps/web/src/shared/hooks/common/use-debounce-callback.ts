"use client"

import * as React from "react"
import debounce from "lodash.debounce"

import { useUnmount } from "@/shared/hooks/common/use-unmount"

type DebounceOptions = {
  leading?: boolean
  trailing?: boolean
  maxWait?: number
  cancelOnUnmount?: boolean
}

type ControlFunctions = {
  cancel: () => void
  flush: () => void
  isPending: () => boolean
}

export type DebouncedState<T extends (...args: unknown[]) => ReturnType<T>> = ((
  ...args: Parameters<T>
) => ReturnType<T> | undefined) &
  ControlFunctions

export function useDebounceCallback<T extends (...args: unknown[]) => ReturnType<T>>(
  func: T,
  delay = 500,
  options?: DebounceOptions
): DebouncedState<T> {
  const debouncedFuncRef = React.useRef<ReturnType<typeof debounce> | null>(null)
  const latestFuncRef = React.useRef(func)
  const cancelOnUnmount = options?.cancelOnUnmount ?? true
  const debounceOptions = React.useMemo(
    () => ({
      leading: options?.leading,
      trailing: options?.trailing,
      maxWait: options?.maxWait,
    }),
    [options?.leading, options?.maxWait, options?.trailing]
  )

  React.useEffect(() => {
    latestFuncRef.current = func
  }, [func])

  useUnmount(() => {
    if (cancelOnUnmount && debouncedFuncRef.current) {
      debouncedFuncRef.current.cancel()
    }
  })

  React.useEffect(() => {
    const debouncedFuncInstance = debounce(
      (...args: Parameters<T>) => latestFuncRef.current(...args),
      delay,
      debounceOptions
    )

    debouncedFuncRef.current = debouncedFuncInstance

    return () => {
      debouncedFuncInstance.cancel()
    }
  }, [debounceOptions, delay])

  const debounced = React.useMemo<DebouncedState<T>>(() => {
    const wrappedFunc = ((...args: Parameters<T>) => {
      return debouncedFuncRef.current?.(...args)
    }) as DebouncedState<T>

    wrappedFunc.cancel = () => {
      debouncedFuncRef.current?.cancel()
    }

    wrappedFunc.isPending = () => {
      return debouncedFuncRef.current !== null
    }

    wrappedFunc.flush = () => {
      return debouncedFuncRef.current?.flush()
    }

    return wrappedFunc
  }, [])

  return debounced
}
