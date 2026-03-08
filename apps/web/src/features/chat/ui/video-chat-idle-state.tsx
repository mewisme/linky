"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import { IconBolt, IconFlame, IconPlayerPlay, IconStar, IconTrophy } from "@tabler/icons-react";

import { Button } from "@ws/ui/components/ui/button";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { getUserProgress } from "@/features/user/api/profile";
import { useQuery } from "@ws/ui/internal-lib/react-query";
import { useUserContext } from "@/providers/user/user-provider";

const PRESTIGE_MILESTONES = [
  { level: 50, tier: "I" },
  { level: 75, tier: "II" },
  { level: 100, tier: "III" },
] as const;

const PRESTIGE_PROXIMITY_THRESHOLD = 5;

function getPrestigeProximity(currentLevel: number): { levelsAway: number; tier: string } | null {
  for (const milestone of PRESTIGE_MILESTONES) {
    const diff = milestone.level - currentLevel;
    if (diff > 0 && diff <= PRESTIGE_PROXIMITY_THRESHOLD) {
      return { levelsAway: diff, tier: milestone.tier };
    }
  }
  return null;
}

function formatExpEarned(exp: number): string {
  if (exp < 60) return `${exp} EXP`;
  const minutes = Math.floor(exp / 60);
  return `${minutes} min`;
}

interface VideoChatIdleStateProps {
  onStart: () => void;
  initialProgress?: UsersAPI.Progress.GetMe.Response | null;
}

export function VideoChatIdleState({ onStart, initialProgress }: VideoChatIdleStateProps) {
  const { user } = useUserContext();
  const { data: progress } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => getUserProgress(),
    initialData: initialProgress,
    gcTime: 5 * 60 * 1000,
  });

  const displayName =
    user.user?.firstName || user.user?.username || "You";

  const prestigeProximity = progress ? getPrestigeProximity(progress.currentLevel) : null;
  const showLevelProximity = progress && progress.expProgress.progressPercentage >= 85;
  const showStreakReminder =
    progress &&
    !progress.isTodayStreakComplete &&
    progress.streak.currentStreak > 0;
  const showExpToday = progress && progress.expEarnedToday > 0;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center pb-24 pt-8"
      data-reaction-exclude
      data-testid="chat-idle-container"
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-6 shadow-lg duration-500 sm:px-8 sm:py-7 dark:border-white/10 dark:bg-black/40 dark:shadow-xl dark:backdrop-blur-md"
        style={{ animationFillMode: "backwards" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="h-14 w-14 rounded-full border-2 border-border/60 ring-2 ring-border/30 sm:h-16 sm:w-16 dark:border-white/15 dark:ring-white/5">
            <AvatarImage
              src={user.user?.imageUrl ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-muted text-base font-medium text-muted-foreground">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">
            Ready to start a chat?
          </h2>
        </div>

        {progress && (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <IconStar className="size-3.5 shrink-0" />
                Level {progress.currentLevel}
              </span>
              <span className="tabular-nums">
                {progress.expProgress.progressPercentage.toFixed(0)}% to next
              </span>
              {progress.streak.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1">
                  <IconFlame className="size-3.5 shrink-0 text-orange-500" />
                  {progress.streak.currentStreak} day
                  {progress.streak.currentStreak !== 1 ? "s" : ""} streak
                </span>
              )}
            </div>

            {(showExpToday || showLevelProximity || showStreakReminder || prestigeProximity) && (
              <div className="flex w-full flex-wrap items-center justify-center gap-1.5 pt-0.5">
                {showExpToday && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <IconBolt className="size-3 shrink-0" />
                    Today: {formatExpEarned(progress.expEarnedToday)} earned
                  </span>
                )}
                {showLevelProximity && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                    <IconStar className="size-3 shrink-0" />
                    Almost Level {progress.currentLevel + 1}!
                  </span>
                )}
                {showStreakReminder && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                    <IconFlame className="size-3 shrink-0" />
                    Complete your streak today
                  </span>
                )}
                {prestigeProximity && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                    <IconTrophy className="size-3 shrink-0" />
                    {prestigeProximity.levelsAway} level{prestigeProximity.levelsAway !== 1 ? "s" : ""} to Prestige {prestigeProximity.tier}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          size="lg"
          onClick={onStart}
          className="h-12 w-full gap-2 rounded-xl px-6 text-base font-semibold shadow-lg sm:h-14 sm:px-8"
          data-testid="chat-start-button"
        >
          <IconPlayerPlay className="size-5" />
          Start Chat
        </Button>

        <p className="text-xs text-muted-foreground">
          You earn EXP by talking
        </p>
      </div>
    </div>
  );
}
