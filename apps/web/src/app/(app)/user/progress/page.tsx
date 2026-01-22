"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { IconClock, IconFlame, IconTrendingUp } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layouts/app-layout";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Progress } from "@repo/ui/components/ui/progress";
import { UsersAPI } from "@/types/users.types";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/components/providers/user/user-provider";

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

export default function UserProgressPage() {
  const { state } = useUserContext();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken();
      setToken(token);
    }
    fetchToken();
  }, [state])

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      const res = await fetch(`/api/user-progress/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load progress data");
      return res.json() as Promise<UsersAPI.Progress.GetMe.Response>;
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <AppLayout label="Progress" description="Track your level, EXP, and streak progress">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout label="Progress" description="Track your level, EXP, and streak progress">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Failed to load progress data. Please try again later.</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout label="Progress" description="Track your level, EXP, and streak progress">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Current Level</CardTitle>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Level {data.currentLevel}
              </Badge>
            </div>
            <CardDescription>Your current progression level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total EXP</span>
                <span className="font-medium">{formatSeconds(data.expProgress.totalExpSeconds)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">EXP to Next Level</span>
                <span className="font-medium">{formatSeconds(data.expProgress.expToNextLevel)}</span>
              </div>
              <Progress value={data.expProgress.progressPercentage} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {data.expProgress.progressPercentage.toFixed(1)}% to Level {data.currentLevel + 1}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <IconFlame className="w-5 h-5 text-orange-500" />
                Streak
              </CardTitle>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {data.streak.currentStreak} days
              </Badge>
            </div>
            <CardDescription>Your daily call streak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Streak</span>
                <span className="font-medium">{data.streak.currentStreak} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Longest Streak</span>
                <span className="font-medium">{data.streak.longestStreak} days</span>
              </div>
              {data.streak.remainingSecondsToKeepStreak > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <IconClock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatSeconds(data.streak.remainingSecondsToKeepStreak)} needed today
                    </span>
                  </div>
                </div>
              )}
              {data.streak.remainingSecondsToKeepStreak === 0 && data.todayCallDuration.isValid && (
                <div className="pt-2 border-t">
                  <Badge variant="default" className="w-full justify-center">
                    Streak maintained today
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <IconTrendingUp className="w-5 h-5 text-blue-500" />
                Today's Activity
              </CardTitle>
              <Badge
                variant={data.todayCallDuration.isValid ? "default" : "secondary"}
                className="text-sm px-3 py-1"
              >
                {data.todayCallDuration.isValid ? "Valid" : "Incomplete"}
              </Badge>
            </div>
            <CardDescription>Call duration for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Call Duration</span>
                <span className="font-medium">{formatSeconds(data.todayCallDuration.totalSeconds)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">
                  {data.todayCallDuration.isValid ? "Streak valid" : "Streak incomplete"}
                </span>
              </div>
              {data.streak.remainingSecondsToKeepStreak > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Need </span>
                    <span className="font-medium">{formatSeconds(data.streak.remainingSecondsToKeepStreak)}</span>
                    <span className="text-muted-foreground"> more to maintain streak</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
