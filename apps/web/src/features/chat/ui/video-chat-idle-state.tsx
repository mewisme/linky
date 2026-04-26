"use client";

import { ShaderAvatar, AvatarFallback, AvatarImage } from "@ws/ui/components/mew-ui/shader";
import {
  IconBolt,
  IconFlame,
  IconPhoneOff,
  IconPlayerPlay,
  IconStar,
  IconTrophy,
} from "@tabler/icons-react";

import { Button } from "@ws/ui/components/ui/button";
import { Skeleton } from "@ws/ui/components/ui/skeleton";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { calculateLevelFromExp } from "@/shared/lib/level-from-exp";
import { useQuery } from "@ws/ui/internal-lib/react-query";
import { useUserContext } from "@/providers/user/user-provider";
import { useTranslations } from "next-intl";
import { useShaderPreference } from "@/shared/hooks/use-shader-preference";
import {
  CardContent,
  ShaderCard,
} from '@ws/ui/components/mew-ui/shader/shader-card';

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

function formatExpEarned(
  exp: number,
  expUnit: string,
  minUnit: string,
): string {
  if (exp < 60) return `${exp} ${expUnit}`;
  const minutes = Math.floor(exp / 60);
  return `${minutes} ${minUnit}`;
}

interface VideoChatIdleStateProps {
  onStart: () => void;
  onEndCall?: () => void;
  connectionStatus?: "idle" | "searching" | "matched" | "in_call" | "reconnecting" | "ended";
  initialProgress?: UsersAPI.Progress.GetMe.Response | null;
}

export function VideoChatIdleState({
  onStart,
  onEndCall,
  connectionStatus,
  initialProgress,
}: VideoChatIdleStateProps) {
  const t = useTranslations("call.idle");
  const { user } = useUserContext();
  const shader = useShaderPreference();
  const { data: progress, isPending } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => fetchFromActionRoute<UsersAPI.Progress.GetMe.Response>("/api/users/progress"),
    initialData: initialProgress ?? undefined,
    gcTime: 5 * 60 * 1000,
  });

  const showFullCardSkeleton = isPending && progress === undefined;

  const displayName =
    user.user?.firstName || user.user?.username || t("you");
  const displayLevel = progress?.expProgress?.totalExpSeconds != null
    ? calculateLevelFromExp(progress.expProgress.totalExpSeconds).level
    : progress?.currentLevel;

  const prestigeProximity = displayLevel ? getPrestigeProximity(displayLevel) : null;
  const showLevelProximity = progress && progress.expProgress.progressPercentage >= 85;
  const showStreakReminder =
    progress &&
    !progress.isTodayStreakComplete &&
    progress.streak.currentStreak > 0;
  const showExpToday = progress && progress.expEarnedToday > 0;

  const expUnit = t("expUnit");
  const minUnit = t("minUnit");

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center pb-24 pt-8"
      data-reaction-exclude
      data-testid="chat-idle-container"
    >
      <ShaderCard
        shader={{ type: shader.type, preset: shader.preset, disableAnimation: shader.disableAnimation }}
        className="w-full max-w-sm bg-card"
      >
        <CardContent
          className="flex w-full flex-col items-center gap-5 px-6 py-6 sm:px-8 sm:py-7"
          style={{ animationFillMode: "backwards" }}
          aria-busy={showFullCardSkeleton}
        >
          {showFullCardSkeleton ? (
            <div
              className="flex w-full flex-col items-center gap-5"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <Skeleton className="size-14 shrink-0 rounded-full sm:size-16" />
                <Skeleton className="h-7 w-52 max-w-full rounded-md sm:h-8 sm:w-60" />
              </div>
              <div className="flex w-full flex-col items-center gap-2">
                <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  <Skeleton className="h-4 w-22 rounded-md sm:w-24" />
                  <Skeleton className="h-4 w-30 rounded-md sm:w-32" />
                  <Skeleton className="h-4 w-33 rounded-md sm:w-36" />
                </div>
                <div className="flex w-full flex-wrap items-center justify-center gap-1.5 pt-0.5">
                  <Skeleton className="h-6 w-28 rounded-full sm:w-32" />
                  <Skeleton className="h-6 w-24 rounded-full sm:w-28" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-xl sm:h-14" />
              <Skeleton className="h-3 w-44 rounded-md" />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <ShaderAvatar shader={{ type: shader.type, preset: shader.preset, disableAnimation: shader.disableAnimation }} className="h-14 w-14 rounded-full border-2 border-border/60 ring-2 ring-border/30 sm:h-16 sm:w-16 dark:border-white/15 dark:ring-white/5">
                  <AvatarImage
                    src={user.user?.imageUrl ?? undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="bg-muted text-base font-medium text-muted-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </ShaderAvatar>
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">{t("readyTitle")}</h2>
              </div>

              {progress && (
                <div className="flex w-full flex-col items-center gap-2">
                  <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <IconStar className="size-3.5 shrink-0" />
                      {t("levelLabel", { level: displayLevel ?? progress.currentLevel })}
                    </span>
                    <span className="tabular-nums">
                      {t("percentToNext", {
                        percent: progress.expProgress.progressPercentage.toFixed(0),
                      })}
                    </span>
                    {progress.streak.currentStreak > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <IconFlame className="size-3.5 shrink-0 text-orange-500" />
                        {progress.streak.currentStreak === 1
                          ? t("dayStreak", { count: progress.streak.currentStreak })
                          : t("daysStreak", { count: progress.streak.currentStreak })}
                      </span>
                    )}
                  </div>

                  {(showExpToday || showLevelProximity || showStreakReminder || prestigeProximity) && (
                    <div className="flex w-full flex-wrap items-center justify-center gap-1.5 pt-0.5">
                      {showExpToday && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          <IconBolt className="size-3 shrink-0" />
                          {t("todayEarned", {
                            amount: formatExpEarned(progress.expEarnedToday, expUnit, minUnit),
                          })}
                        </span>
                      )}
                      {showLevelProximity && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                          <IconStar className="size-3 shrink-0" />
                          {t("almostLevel", { level: (displayLevel ?? progress.currentLevel) + 1 })}
                        </span>
                      )}
                      {showStreakReminder && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                          <IconFlame className="size-3 shrink-0" />
                          {t("completeStreakToday")}
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
                {t("startChat")}
              </Button>
              {connectionStatus === "searching" && onEndCall && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={onEndCall}
                  className="h-12 w-full gap-2 rounded-xl px-6 text-base font-semibold sm:h-14 sm:px-8"
                  data-testid="chat-cancel-search-button"
                >
                  <IconPhoneOff className="size-5" />
                  {t("endSearch")}
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                {t("footerHint")}
              </p>
            </>
          )}
        </CardContent>
      </ShaderCard>
    </div>
  );
}
