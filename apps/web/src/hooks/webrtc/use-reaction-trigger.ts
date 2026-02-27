"use client";

import * as Sentry from "@sentry/nextjs";

import { useCallback, useRef } from "react";

import { useReactionEffectContext } from "@/components/providers/realtime/reaction-effect-provider";

interface UseReactionTriggerOptions {
  isActive: boolean;
  reactionType?: string;
}

const MAX_TAP_COUNT = 8;

export function useReactionTrigger({ isActive, reactionType = "heart" }: UseReactionTriggerOptions) {
  const tapCountRef = useRef<number>(0);
  const tapWindowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { triggerLocalReaction, emitReaction } = useReactionEffectContext();

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (!isActive) {
        Sentry.metrics.count("reaction_trigger_not_active", 1);
        return;
      }

      tapCountRef.current += 1;

      if (tapCountRef.current >= 2) {
        Sentry.metrics.count("reaction_trigger_double_tap", 1);
        triggerLocalReaction({ x, y }, reactionType);

        if (tapCountRef.current >= MAX_TAP_COUNT) {
          if (tapWindowTimerRef.current) {
            clearTimeout(tapWindowTimerRef.current);
          }
          const reactionCount = tapCountRef.current - 1;
          emitReaction(reactionCount, reactionType);
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
          const reactionCount = count - 1;
          emitReaction(reactionCount, reactionType);
        }

        tapCountRef.current = 0;
        tapWindowTimerRef.current = null;
      }, 500);
    },
    [isActive, triggerLocalReaction, emitReaction, reactionType]
  );

  return {
    handleTap,
  };
}
