"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ws/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ws/ui/components/ui/dialog";
import { IconClock, IconFlame, IconSnowflake, IconStar } from "@tabler/icons-react";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Badge } from "@ws/ui/components/ui/badge";
import { Button } from "@ws/ui/components/ui/button";
import { Loader2 } from "@ws/ui/internal-lib/icons";
import { Progress } from "@ws/ui/components/ui/progress";
import { ExpAmountLabel } from "./exp-amount-label";
import { ExpBonusesActive } from "./exp-bonuses-active";
import { StreakCalendar } from "./streak-calendar";
import { StreakMiniCalendar } from "./streak-mini-calendar";
import { UsersAPI } from "@/entities/user/types/users.types";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { calculateLevelFromExp } from "@/shared/lib/level-from-exp";
import { useQuery } from "@ws/ui/internal-lib/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface ProgressClientProps {
  initialData: UsersAPI.Progress.GetMe.Response
}

export function ProgressClient({ initialData }: ProgressClientProps) {
  const t = useTranslations("user.progress");
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return t("durationHms", { hours, minutes, seconds: secs });
    }
    if (minutes > 0) {
      return t("durationMs", { minutes, seconds: secs });
    }
    return t("durationS", { seconds: secs });
  };
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => fetchFromActionRoute<UsersAPI.Progress.GetMe.Response>("/api/users/progress"),
    initialData,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <AppLayout sidebarItem="progress" className="space-y-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout sidebarItem="progress" className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{t("loadFailed")}</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const isTodayStreakComplete = data.isTodayStreakComplete;
  const streakDisplayStatus =
    isTodayStreakComplete ? "active" : data.streakStatus === "frozen" ? "frozen" : "incomplete";
  const displayLevel = data.expProgress?.totalExpSeconds != null
    ? calculateLevelFromExp(data.expProgress.totalExpSeconds).level
    : data.currentLevel;

  return (
    <AppLayout sidebarItem="progress" className="space-y-6">
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="progress-level-card">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <IconStar className="w-5 h-5 text-yellow-500" />
                  {t("currentLevelTitle")}
                </CardTitle>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {t("levelBadge", { level: displayLevel })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Progress value={data.expProgress.progressPercentage} className="h-2" />
                  <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                    <span>
                      {t("percentToLevel", {
                        percent: data.expProgress.progressPercentage.toFixed(0),
                        level: displayLevel + 1,
                      })}
                    </span>
                    <ExpAmountLabel
                      exp={data.expProgress.expToNextLevel}
                      messageKey="expAmountRemaining"
                      className="font-medium text-foreground tabular-nums"
                      testId="progress-exp-remaining"
                    />
                  </div>
                </div>
                {(data.expEarnedToday ?? 0) > 0 && (
                  <div className="flex justify-between gap-3 border-t pt-4 text-sm">
                    <span className="text-muted-foreground">{t("expEarnedToday")}</span>
                    <ExpAmountLabel
                      exp={data.expEarnedToday}
                      className="font-medium tabular-nums"
                      testId="progress-exp-today"
                    />
                  </div>
                )}
                {data.expBonuses && data.expBonuses.length > 0 && (
                  <ExpBonusesActive bonuses={data.expBonuses} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="progress-streak-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {streakDisplayStatus === "frozen" ? (
                    <IconSnowflake className="w-5 h-5 text-sky-500" aria-hidden />
                  ) : (
                    <IconFlame className="w-5 h-5 text-orange-500" />
                  )}
                  {t("streakTitle")}
                </CardTitle>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCalendarDialogOpen(true)}
                    className="text-xs"
                  >
                    {t("viewAll")}
                  </Button>
                  {isTodayStreakComplete ? (
                    <span
                      className="text-sm font-medium tabular-nums text-foreground"
                      data-testid="progress-today-call-duration-header"
                    >
                      {formatDuration(data.todayCallDurationSeconds)}
                    </span>
                  ) : (
                    <Badge
                      variant={
                        streakDisplayStatus === "frozen" ? "secondary" : "outline"
                      }
                      className="text-sm px-3 py-1"
                    >
                      {streakDisplayStatus === "frozen"
                        ? t("statusFrozen")
                        : t("statusIncomplete")}
                    </Badge>
                  )}
                  {isTodayStreakComplete && (
                    <Badge variant="default" className="text-sm px-3 py-1">
                      {t("statusComplete")}
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>{t("streakDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t("currentStreak")}</span>
                      <span className="font-medium tabular-nums" data-testid="progress-current-streak">
                        {t("days", { count: data.streak.currentStreak })}
                        {streakDisplayStatus === "frozen" && (
                          <span className="ml-1.5 text-sky-600" title={t("freezeTitle")}>
                            <IconSnowflake className="inline-block size-3.5" aria-hidden />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t("longestStreak")}</span>
                      <span className="font-medium tabular-nums" data-testid="progress-longest-streak">
                        {t("days", { count: data.streak.longestStreak })}
                      </span>
                    </div>
                  </div>
                  {data.freeze && data.freeze.availableCount != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("freezeAvailable")}</span>
                      <span className="font-medium">{data.freeze.availableCount}</span>
                    </div>
                  )}
                  {streakDisplayStatus === "frozen" && (
                    <p className="text-xs text-muted-foreground">{t("freezeUsedToday")}</p>
                  )}
                </div>
                {!isTodayStreakComplete && (
                  <div className="border-t pt-4">
                    <div className="space-y-3">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{t("todayCallDuration")}</span>
                        <span className="font-medium tabular-nums">
                          {formatDuration(data.todayCallDurationSeconds)}
                        </span>
                      </div>
                      {data.streakRemainingSeconds > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <IconClock className="size-4 shrink-0 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {t("moreNeededToday", { time: formatDuration(data.streakRemainingSeconds) })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t("miniCalendarHeading")}</p>
                    <StreakMiniCalendar progressData={data} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconFlame className="w-5 h-5 text-orange-500" />
              {t("calendarDialogTitle")}
            </DialogTitle>
            <DialogDescription>{t("calendarDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-x-auto">
            <StreakCalendar />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
