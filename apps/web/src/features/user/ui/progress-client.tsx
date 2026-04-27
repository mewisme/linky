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
import { StreakCalendar } from "./streak-calendar";
import { StreakMiniCalendar } from "./streak-mini-calendar";
import { UsersAPI } from "@/entities/user/types/users.types";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { calculateLevelFromExp } from "@/shared/lib/level-from-exp";
import { useQuery } from "@ws/ui/internal-lib/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShaderCard } from "@ws/ui/components/mew-ui/shader/shader-card";

function formatExp(exp: number): string {
  if (exp >= 1000000) {
    return `${(exp / 1000000).toFixed(1)}M`;
  }
  if (exp >= 1000) {
    return `${(exp / 1000).toFixed(1)}k`;
  }
  return exp.toString();
}

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

  const streakDisplayStatus =
    data.isTodayStreakComplete ? "active" : data.streakStatus === "frozen" ? "frozen" : "incomplete";
  const displayLevel = data.expProgress?.totalExpSeconds != null
    ? calculateLevelFromExp(data.expProgress.totalExpSeconds).level
    : data.currentLevel;

  return (
    <AppLayout sidebarItem="progress" className="space-y-4">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <ShaderCard data-testid="progress-level-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <IconStar className="w-5 h-5 text-yellow-500" />
                  {t("currentLevelTitle")}
                </CardTitle>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {t("levelBadge", { level: displayLevel })}
                </Badge>
              </div>
              <CardDescription>{t("currentLevelDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("expToNext")}</span>
                    <span className="font-medium" data-testid="progress-exp-remaining">
                      {t("expAmount", { amount: formatExp(data.expProgress.expToNextLevel) })}
                    </span>
                  </div>
                  <Progress value={data.expProgress.progressPercentage} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {t("percentToLevel", {
                      percent: data.expProgress.progressPercentage.toFixed(1),
                      level: displayLevel + 1,
                    })}
                  </p>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("expEarnedToday")}</span>
                    <span className="font-medium" data-testid="progress-exp-today">
                      {t("expAmount", { amount: formatExp(data.expEarnedToday ?? 0) })}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t("nextLevelHeading")}</span>
                      <Badge variant="outline" className="text-xs">
                        {t("nextLevelBadge", { level: displayLevel + 1 })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("unlockHint")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("favoritesBonusHint")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </ShaderCard>

          <ShaderCard data-testid="progress-streak-card">
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCalendarDialogOpen(true)}
                    className="text-xs"
                  >
                    {t("viewAll")}
                  </Button>
                  <Badge
                    variant={
                      streakDisplayStatus === "active"
                        ? "default"
                        : streakDisplayStatus === "frozen"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-sm px-3 py-1"
                  >
                    {streakDisplayStatus === "active"
                      ? t("statusComplete")
                      : streakDisplayStatus === "frozen"
                        ? t("statusFrozen")
                        : t("statusIncomplete")}
                  </Badge>
                </div>
              </div>
              <CardDescription>{t("streakDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("currentStreak")}</span>
                    <span className="font-medium" data-testid="progress-current-streak">
                      {t("days", { count: data.streak.currentStreak })}
                      {streakDisplayStatus === "frozen" && (
                        <span className="ml-1.5 text-sky-600" title={t("freezeTitle")}>
                          <IconSnowflake className="inline-block size-3.5" aria-hidden />
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("longestStreak")}</span>
                    <span className="font-medium" data-testid="progress-longest-streak">{t("days", { count: data.streak.longestStreak })}</span>
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
                <div className="pt-3 border-t">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("todayCallDuration")}</span>
                      <span className="font-medium">{formatDuration(data.todayCallDurationSeconds)}</span>
                    </div>
                    {data.streakRemainingSeconds > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <IconClock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {t("moreNeededToday", { time: formatDuration(data.streakRemainingSeconds) })}
                        </span>
                      </div>
                    )}
                    {data.isTodayStreakComplete && (
                      <Badge variant="default" className="w-full justify-center">
                        {t("streakCompletedToday")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t("miniCalendarHeading")}</p>
                    <StreakMiniCalendar progressData={data} />
                  </div>
                </div>
              </div>
            </CardContent>
          </ShaderCard>
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
