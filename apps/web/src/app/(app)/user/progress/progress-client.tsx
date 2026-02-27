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

import { AppLayout } from "@/components/layouts/app-layout";
import { Badge } from "@ws/ui/components/ui/badge";
import { Button } from "@ws/ui/components/ui/button";
import { Loader2 } from "@ws/ui/internal-lib/icons";
import { Progress } from "@ws/ui/components/ui/progress";
import { StreakCalendar } from "@/components/user/streak-calendar";
import { StreakMiniCalendar } from "@/components/user/streak-mini-calendar";
import { UsersAPI } from "@/types/users.types";
import { getUserTimezone } from "@/utils/timezone";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getUserProgress } from "@/lib/actions/user/profile";

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

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
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => getUserProgress(getUserTimezone()),
    initialData,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <AppLayout label="Progress" description="Track your level, EXP, and streak progress" className="space-y-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout label="Progress" description="Track your level, EXP, and streak progress" className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Failed to load progress data. Please try again later.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout label="Progress" description="Track your level, EXP, and streak progress" className="space-y-4">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="progress-level-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <IconStar className="w-5 h-5 text-yellow-500" />
                  Current Level
                </CardTitle>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Level {data.currentLevel}
                </Badge>
              </div>
              <CardDescription>Your current progression level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">EXP to Next Level</span>
                    <span className="font-medium" data-testid="progress-exp-remaining">{formatExp(data.expProgress.expToNextLevel)} EXP</span>
                  </div>
                  <Progress value={data.expProgress.progressPercentage} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {data.expProgress.progressPercentage.toFixed(1)}% to Level {data.currentLevel + 1}
                  </p>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">EXP earned today</span>
                    <span className="font-medium" data-testid="progress-exp-today">{formatExp(data.expEarnedToday ?? 0)} EXP</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Next Level</span>
                      <Badge variant="outline" className="text-xs">
                        Level {data.currentLevel + 1}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keep progressing to unlock future rewards
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Calling favorites gives bonus EXP. Mutual favorites give higher bonus.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="progress-streak-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {data.streakStatus === "frozen" ? (
                    <IconSnowflake className="w-5 h-5 text-sky-500" aria-hidden />
                  ) : (
                    <IconFlame className="w-5 h-5 text-orange-500" />
                  )}
                  Streak
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCalendarDialogOpen(true)}
                    className="text-xs"
                  >
                    View all
                  </Button>
                  <Badge
                    variant={
                      data.streakStatus === "active"
                        ? "default"
                        : data.streakStatus === "frozen"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-sm px-3 py-1"
                  >
                    {data.streakStatus === "active"
                      ? "Complete"
                      : data.streakStatus === "frozen"
                        ? "Frozen"
                        : "Incomplete"}
                  </Badge>
                </div>
              </div>
              <CardDescription>Your daily call streak</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Streak</span>
                    <span className="font-medium" data-testid="progress-current-streak">
                      {data.streak.currentStreak} days
                      {data.streakStatus === "frozen" && (
                        <span className="ml-1.5 text-sky-600" title="Freeze used to continue">
                          <IconSnowflake className="inline-block size-3.5" aria-hidden />
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Longest Streak</span>
                    <span className="font-medium" data-testid="progress-longest-streak">{data.streak.longestStreak} days</span>
                  </div>
                  {data.freeze && data.freeze.availableCount != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Freeze available</span>
                      <span className="font-medium">{data.freeze.availableCount}</span>
                    </div>
                  )}
                  {data.streakStatus === "frozen" && (
                    <p className="text-xs text-muted-foreground">Freeze used today</p>
                  )}
                </div>
                <div className="pt-3 border-t">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Today&apos;s Call Duration</span>
                      <span className="font-medium">{formatSeconds(data.todayCallDurationSeconds)}</span>
                    </div>
                    {data.streakRemainingSeconds > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <IconClock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatSeconds(data.streakRemainingSeconds)} more needed today
                        </span>
                      </div>
                    )}
                    {data.isTodayStreakComplete && (
                      <Badge variant="default" className="w-full justify-center">
                        Streak completed today
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Current Streak</p>
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
              Streak Calendar
            </DialogTitle>
            <DialogDescription>View your complete streak history</DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-x-auto">
            <StreakCalendar />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
