"use client";

import {
  MiniCalendar,
  MiniCalendarDay,
  MiniCalendarDays,
} from "@ws/ui/components/kibo-ui/mini-calendar";
import { format, subDays } from "@ws/ui/internal-lib/date-fns";
import { useEffect, useMemo, useState } from "react";

import { IconFlameFilled } from "@tabler/icons-react";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { getLocalDate } from "@ws/ui/internal-lib/date-utils";

interface StreakMiniCalendarProps {
  progressData: UsersAPI.Progress.GetMe.Response;
  className?: string;
}

function getTotalDaysToShow(): number {
  return 7;
}

export function StreakMiniCalendar({
  progressData,
  className,
}: StreakMiniCalendarProps) {
  const [totalDaysToShow, setTotalDaysToShow] = useState(() => getTotalDaysToShow());
  const todayDate = useMemo(() => {
    if (progressData.todayDate) {
      return getLocalDate(new Date(`${progressData.todayDate}T00:00:00`));
    }

    return getLocalDate(new Date());
  }, [progressData.todayDate]);
  const todayStr = format(todayDate, "yyyy-MM-dd");
  const currentStreak = Math.max(0, progressData.streak.currentStreak ?? 0);
  const isTodayStreakComplete = progressData.isTodayStreakComplete ?? false;
  const validStreakDateSet = useMemo(() => {
    const next = new Set<string>();

    if (currentStreak <= 0) {
      return next;
    }

    const historicalStreakLength = isTodayStreakComplete ? currentStreak - 1 : currentStreak;
    for (let i = 1; i <= historicalStreakLength; i++) {
      next.add(format(subDays(todayDate, i), "yyyy-MM-dd"));
    }

    if (isTodayStreakComplete) {
      next.add(todayStr);
    }

    return next;
  }, [currentStreak, isTodayStreakComplete, todayDate, todayStr]);

  useEffect(() => {
    const handleResize = () => {
      setTotalDaysToShow(getTotalDaysToShow());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startDate = useMemo(() => {
    const daysBefore = Math.floor(totalDaysToShow / 2);
    const startDate = subDays(todayDate, daysBefore);
    return getLocalDate(startDate);
  }, [todayDate, totalDaysToShow]);

  const getDayStatus = (date: Date) => {
    const dateToCheck = getLocalDate(date);
    const dateStr = format(dateToCheck, "yyyy-MM-dd");
    const isTodayDate = dateStr === todayStr;
    const isValid = isTodayDate ? isTodayStreakComplete : validStreakDateSet.has(dateStr);
    return { isValid, isToday: isTodayDate };
  };

  return (
    <div className="w-full">
      <MiniCalendar
        startDate={startDate}
        days={totalDaysToShow}
        className={className}
      >
        <MiniCalendarDays className="w-full">
          {(date) => {
            const { isValid, isToday: isTodayDate } = getDayStatus(date);

            return (
              <div className="relative flex-1 min-w-0" key={date.toISOString()}>
                <MiniCalendarDay date={date} className="w-full min-w-0" />
                <div className="absolute -top-1 -right-1">
                  {isValid ? (
                    <IconFlameFilled className="h-4 w-4 text-orange-500" />
                  ) : isTodayDate ? (
                    <IconFlameFilled className="h-4 w-4 text-muted-foreground" />
                  ) : null}
                </div>
              </div>
            );
          }}
        </MiniCalendarDays>
      </MiniCalendar>
    </div>
  );
}
