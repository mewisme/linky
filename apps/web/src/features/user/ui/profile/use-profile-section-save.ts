"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const DONE_DISPLAY_MS = 1000;

export function useProfileSectionSave() {
  const [isPending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(false);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (doneTimeoutRef.current) {
        clearTimeout(doneTimeoutRef.current);
      }
    };
  }, []);

  const runSave = useCallback(
    (performSave: () => Promise<boolean>, onAfterDone?: () => void) => {
      startTransition(async () => {
        const succeeded = await performSave();
        if (!succeeded) return;

        setIsDone(true);
        if (doneTimeoutRef.current) {
          clearTimeout(doneTimeoutRef.current);
        }
        doneTimeoutRef.current = setTimeout(() => {
          setIsDone(false);
          onAfterDone?.();
        }, DONE_DISPLAY_MS);
      });
    },
    [],
  );

  return { isPending, isDone, runSave };
}
