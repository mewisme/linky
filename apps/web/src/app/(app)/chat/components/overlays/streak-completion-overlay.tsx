"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import {
  STREAK_IMAGE_FIXED_SIZE,
  STREAK_IMAGE_LOOP_COUNT,
  getStreakImagePath,
} from "@/lib/constants/visual-effect";
import { useReactionEffectContext } from "@/components/providers/realtime/reaction-effect-provider";

const FRAME_DURATION_MS = 140;
const TOTAL_FRAMES = 8 * STREAK_IMAGE_LOOP_COUNT;

export function StreakCompletionOverlay() {
  const { streakCompletion, clearStreakCompletion } = useReactionEffectContext();
  const [imageIndex, setImageIndex] = useState(1);

  useEffect(() => {
    if (!streakCompletion) return;
    setImageIndex(1);
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      setImageIndex((current % 8) || 8);
      if (current >= TOTAL_FRAMES) {
        clearInterval(id);
        clearStreakCompletion();
      }
    }, FRAME_DURATION_MS);
    return () => clearInterval(id);
  }, [streakCompletion, clearStreakCompletion]);

  if (!streakCompletion) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md bg-black/50 pointer-events-auto"
      aria-hidden
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={imageIndex}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.08, ease: "easeOut" }}
          className="flex items-center justify-center"
          style={{
            width: STREAK_IMAGE_FIXED_SIZE,
            height: STREAK_IMAGE_FIXED_SIZE,
          }}
        >
          <img
            src={getStreakImagePath(imageIndex)}
            alt=""
            width={STREAK_IMAGE_FIXED_SIZE}
            height={STREAK_IMAGE_FIXED_SIZE}
            className="object-contain select-none"
            draggable={false}
            style={{
              width: STREAK_IMAGE_FIXED_SIZE,
              height: STREAK_IMAGE_FIXED_SIZE,
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
