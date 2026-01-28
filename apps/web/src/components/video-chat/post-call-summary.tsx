"use client";

import { useEffect, useRef, useState } from "react";

import { Progress } from "@repo/ui/components/ui/progress";
import type { UsersAPI } from "@/types/users.types";
import { getUserTimezone } from "@/utils/timezone";
import { motion } from "motion/react";
import { progressionAnalytics } from "@/lib/analytics/progression-analytics";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/components/providers/user/user-provider";
import { useUserStore } from "@/stores/user-store";
import { useVideoChatStore } from "@/stores/video-chat-store";

const DISPLAY_MS = 3400;
const FADE_MS = 400;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PostCallSummary() {
  const { state } = useUserContext();
  const user = useUserStore((s) => s.user);
  const [token, setToken] = useState<string | null>(null);
  const progressRef = useRef<number | null>(null);
  const [progressAnimate, setProgressAnimate] = useState(0);
  const startTimeRef = useRef(Date.now());
  const hasTrackedRef = useRef(false);

  const postCallSummary = useVideoChatStore((s) => s.postCallSummary);
  const setPostCallSummary = useVideoChatStore((s) => s.setPostCallSummary);

  useEffect(() => {
    let mounted = true;
    state.getToken().then((t) => {
      if (mounted) setToken(t);
    });
    return () => {
      mounted = false;
    };
  }, [state]);

  const { data: progress } = useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      const res = await fetch("/api/user-progress/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-timezone": getUserTimezone(),
        },
      });
      if (!res.ok) throw new Error("Failed to load progress");
      return res.json() as Promise<UsersAPI.Progress.GetMe.Response>;
    },
    enabled: !!token && !!postCallSummary,
  });

  useEffect(() => {
    if (!progress || !postCallSummary) return;
    progressRef.current = progress.expProgress.progressPercentage;
    const t = setTimeout(() => setProgressAnimate(progress.expProgress.progressPercentage), 50);
    return () => clearTimeout(t);
  }, [progress, postCallSummary]);

  useEffect(() => {
    if (!postCallSummary) return;
    const t = setTimeout(() => {
      if (user?.id && !hasTrackedRef.current) {
        hasTrackedRef.current = true;
        const viewDuration = Date.now() - startTimeRef.current;
        progressionAnalytics.trackPostCallSummary({
          userId: user.id,
          expEarned: postCallSummary.expEarned,
          viewDuration,
          dismissedEarly: false,
        });
        progressionAnalytics.trackExpEarned({
          userId: user.id,
          amount: postCallSummary.expEarned,
          baseAmount: postCallSummary.expEarned,
          bonusAmount: 0,
          source: "call",
          callDuration: postCallSummary.callDurationSeconds,
          hasFavoriteBonus: postCallSummary.hadFavoriteBonus ?? false,
        });
      }
      setPostCallSummary(null);
    }, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [postCallSummary, setPostCallSummary, user]);

  const handleDismiss = () => {
    if (user?.id && postCallSummary && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      const viewDuration = Date.now() - startTimeRef.current;
      progressionAnalytics.trackPostCallSummary({
        userId: user.id,
        expEarned: postCallSummary.expEarned,
        viewDuration,
        dismissedEarly: viewDuration < DISPLAY_MS,
      });
      progressionAnalytics.trackExpEarned({
        userId: user.id,
        amount: postCallSummary.expEarned,
        baseAmount: postCallSummary.expEarned,
        bonusAmount: 0,
        source: "call",
        callDuration: postCallSummary.callDurationSeconds,
        hasFavoriteBonus: postCallSummary.hadFavoriteBonus ?? false,
      });
    }
    setPostCallSummary(null);
  };

  if (!postCallSummary) return null;

  const progressValue = progress ? progressAnimate : 0;

  return (
    <motion.div
      role="dialog"
      aria-label="Post-call summary"
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: FADE_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
      onClick={handleDismiss}
    >
      <motion.div
        className="flex w-full max-w-xs flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-xl"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: FADE_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1 text-center">
          <p className="text-sm text-muted-foreground">Call ended</p>
          <p className="text-2xl font-mono font-semibold tabular-nums text-foreground">
            {formatDuration(postCallSummary.callDurationSeconds)}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">EXP earned</span>
            <span className="font-medium text-foreground">+{postCallSummary.expEarned} EXP</span>
          </div>
          {postCallSummary.hadFavoriteBonus && (
            <p className="text-xs text-muted-foreground">Bonus EXP (Favorite)</p>
          )}
          {postCallSummary.hadStreakComplete && (
            <p className="text-xs font-medium text-foreground">Streak completed today</p>
          )}
        </div>

        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Level {progress.currentLevel}</span>
              <span>{progressValue.toFixed(0)}% to Level {progress.currentLevel + 1}</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">Click anywhere to close</p>
      </motion.div>
    </motion.div>
  );
}
