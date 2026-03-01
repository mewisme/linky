"use client";

import { AnimatePresence, motion } from "@ws/ui/internal-lib/motion";
import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { trackEvent } from "@/lib/telemetry/events/client";
import { getQueueStatus } from "@/actions/matchmaking";

const BASE_HINTS = [
  "You earn EXP by talking",
  "Skipping helps find better matches",
  "You can favorite people you like",
  "Interest tags improve your match quality",
  "Mutual favorites are matched first",
  "Streaks give bonus EXP every day",
  "Level up to unlock new features",
  "Complete today's streak while you chat",
  "Your longest-ever match might be next",
  "Every call counts toward your progress",
] as const;

const HINT_ROTATE_MS = 4500;
const STILL_SEARCHING_THRESHOLD_MS = 10_000;
const ALT_ACTION_THRESHOLD_MS = 30_000;

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

function formatQueueLabel(queueSize: number): string {
  if (!queueSize || queueSize <= 1) return "You're first in line";
  return `~${queueSize} people waiting`;
}

interface VideoChatSearchingStateProps {
  progress?: UsersAPI.Progress.GetMe.Response | null;
}

export function VideoChatSearchingState({ progress }: VideoChatSearchingStateProps) {
  const [hintIndex, setHintIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const startedAt = useRef(Date.now());
  const hasFetchedQueue = useRef(false);

  const hints = BASE_HINTS;

  useEffect(() => {
    const hintId = setInterval(() => {
      setHintIndex((i) => (i + 1) % hints.length);
    }, HINT_ROTATE_MS);
    return () => clearInterval(hintId);
  }, [hints.length]);

  useEffect(() => {
    const tickId = setInterval(() => {
      setElapsedMs(Date.now() - startedAt.current);
    }, 1000);
    return () => clearInterval(tickId);
  }, []);

  useEffect(() => {
    if (elapsedMs >= STILL_SEARCHING_THRESHOLD_MS && !hasFetchedQueue.current) {
      hasFetchedQueue.current = true;
      trackEvent({ name: "matchmaking_still_searching", properties: { elapsed_ms: elapsedMs } });
      getQueueStatus()
        .then(setQueueStatus)
        .catch(() => { });
    }
  }, [elapsedMs]);

  const showStillSearching = elapsedMs >= STILL_SEARCHING_THRESHOLD_MS;
  const showAltAction = elapsedMs >= ALT_ACTION_THRESHOLD_MS;

  const motivationalStat = (() => {
    if (!progress) return null;
    if (progress.expEarnedToday > 0) {
      const minutes = Math.floor(progress.expEarnedToday / 60);
      if (minutes > 0) return `You've already earned ${minutes} min of EXP today`;
    }
    if (progress.streak.currentStreak > 1) {
      return `Keep your ${progress.streak.currentStreak}-day streak going`;
    }
    return null;
  })();

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
            {showStillSearching ? "Still searching…" : "Finding someone new…"}
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

          {showStillSearching && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-muted-foreground"
            >
              {queueStatus
                ? formatQueueLabel(queueStatus.queueSize)
                : motivationalStat ?? "Hang tight, finding your best match"}
            </motion.p>
          )}
        </div>

        <div className="flex min-h-8 w-full flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={hintIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-center text-xs text-muted-foreground"
            >
              {hints[hintIndex]}
            </motion.p>
          </AnimatePresence>

          {showAltAction && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                href="/user/progress"
                className="text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => trackEvent({ name: "matchmaking_alt_action_clicked", properties: { elapsed_ms: elapsedMs } })}
              >
                Visit your progress page while you wait
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
