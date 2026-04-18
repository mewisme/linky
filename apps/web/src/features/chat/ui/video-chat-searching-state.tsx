"use client";

import { AnimatePresence, motion } from "@ws/ui/internal-lib/motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { trackEvent } from "@/lib/telemetry/events/client";
import { getQueueStatus } from "@/actions/matchmaking";
import { Button } from "@ws/ui/components/ui/button";
import { IconPhoneOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

const HINT_ROTATE_MS = 4500;
const STILL_SEARCHING_THRESHOLD_MS = 10_000;
const ALT_ACTION_THRESHOLD_MS = 30_000;

const HINT_KEYS = [
  "hint0",
  "hint1",
  "hint2",
  "hint3",
  "hint4",
  "hint5",
  "hint6",
  "hint7",
  "hint8",
  "hint9",
] as const;

interface QueueStatus {
  queueSize: number;
  estimatedWaitSeconds: number | null;
}

interface VideoChatSearchingStateProps {
  progress?: UsersAPI.Progress.GetMe.Response | null;
  onEndCall?: () => void;
}

export function VideoChatSearchingState({ progress, onEndCall }: VideoChatSearchingStateProps) {
  const t = useTranslations("call.searching");
  const tControls = useTranslations("call.controls");

  const hints = useMemo(() => HINT_KEYS.map((key) => t(key)), [t]);

  const [hintIndex, setHintIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [showEndSearch, setShowEndSearch] = useState(false);
  const startedAt = useRef(0);
  const hasFetchedQueue = useRef(false);

  useEffect(() => {
    const hintId = setInterval(() => {
      setHintIndex((i) => (i + 1) % hints.length);
    }, HINT_ROTATE_MS);
    return () => clearInterval(hintId);
  }, [hints.length]);

  useEffect(() => {
    if (startedAt.current === 0) {
      startedAt.current = Date.now();
    }
    const tickId = setInterval(() => {
      setElapsedMs(Date.now() - startedAt.current);
    }, 1000);
    return () => clearInterval(tickId);
  }, []);

  useEffect(() => {
    setShowEndSearch(false);
    const timeoutId = setTimeout(() => {
      setShowEndSearch(true);
    }, 1500);
    return () => clearTimeout(timeoutId);
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

  const queueOrMotivationLine = (() => {
    if (queueStatus) {
      if (!queueStatus.queueSize || queueStatus.queueSize <= 1) return t("firstInLine");
      return t("peopleWaiting", { count: queueStatus.queueSize });
    }
    if (!progress) return null;
    if (progress.expEarnedToday > 0) {
      const minutes = Math.floor(progress.expEarnedToday / 60);
      if (minutes > 0) return t("earnedMinToday", { minutes });
    }
    if (progress.streak.currentStreak > 1) {
      return t("keepStreak", { days: progress.streak.currentStreak });
    }
    return null;
  })();

  const motivationalStat =
    queueOrMotivationLine ?? (showStillSearching ? t("hangTight") : null);

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
            {showStillSearching ? t("stillSearching") : t("findingNew")}
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
              {motivationalStat}
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
                {t("visitProgressLink")}
              </Link>
            </motion.div>
          )}
          <AnimatePresence>
            {onEndCall && showEndSearch && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-xs"
              >
                <Button
                  variant="destructive"
                  onClick={onEndCall}
                  className="mt-1 h-10 w-full gap-2"
                  data-testid="chat-cancel-search-button"
                >
                  <IconPhoneOff className="size-4" />
                  {tControls("endSearch")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
