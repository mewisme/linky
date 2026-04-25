"use client"

import * as React from "react"

export function useUnmount(func: () => void) {
  const funcRef = React.useRef(func)

  // eslint-disable-next-line react-hooks/refs
  funcRef.current = func

  React.useEffect(
    () => () => {
      funcRef.current()
    },
    []
  )
}
