"use client";

import { useEffect, useState } from "react";

import { motion } from "motion/react";

const HINTS = [
  "You earn EXP by talking",
  "Skipping helps find better matches",
  "You can favorite people you like",
] as const;

const HINT_ROTATE_MS = 4500;

export function VideoChatSearchingState() {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setHintIndex((i) => (i + 1) % HINTS.length);
    }, HINT_ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center pb-24 pt-8"
      data-reaction-exclude
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-8 shadow-lg duration-300 sm:px-8 sm:py-10 dark:border-white/10 dark:bg-black/40 dark:shadow-xl dark:backdrop-blur-md"
        style={{ animationFillMode: "backwards" }}
        data-testid="chat-searching-indicator"
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">
            Finding someone new…
          </h2>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: i * 0.35,
                }}
                className="size-2 rounded-full bg-muted-foreground"
                aria-hidden
              />
            ))}
          </div>
        </div>

        <p
          key={hintIndex}
          className="animate-in fade-in-0 duration-300 min-h-5 text-center text-xs text-muted-foreground"
          style={{ animationFillMode: "backwards" }}
        >
          {HINTS[hintIndex]}
        </p>
      </div>
    </div>
  );
}