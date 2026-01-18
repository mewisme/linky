"use client";

import { useCallback, useRef } from "react";

import { useHeartReactionContext } from "@/components/providers/heart-reaction-provider";

interface UseHeartReactionOptions {
  isActive: boolean;
}

const MAX_TAP_COUNT = 8;

export function useHeartReaction({ isActive }: UseHeartReactionOptions) {
  const tapCountRef = useRef<number>(0);
  const tapWindowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { triggerLocalHeart, emitHeartReaction } = useHeartReactionContext();

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (!isActive) return;

      tapCountRef.current += 1;

      if (tapCountRef.current >= 2) {
        triggerLocalHeart({ x, y });

        if (tapCountRef.current >= MAX_TAP_COUNT) {
          if (tapWindowTimerRef.current) {
            clearTimeout(tapWindowTimerRef.current);
          }
          const heartCount = tapCountRef.current - 1;
          emitHeartReaction(heartCount);
          tapCountRef.current = 0;
          tapWindowTimerRef.current = null;
          return;
        }
      }

      if (tapWindowTimerRef.current) {
        clearTimeout(tapWindowTimerRef.current);
      }

      tapWindowTimerRef.current = setTimeout(() => {
        const count = tapCountRef.current;

        if (count >= 2) {
          const heartCount = count - 1;
          emitHeartReaction(heartCount);
        }

        tapCountRef.current = 0;
        tapWindowTimerRef.current = null;
      }, 500);
    },
    [isActive, triggerLocalHeart, emitHeartReaction]
  );

  return {
    handleTap,
  };
}
