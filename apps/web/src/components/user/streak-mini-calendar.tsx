"use client";

import {
  MiniCalendar,
  MiniCalendarDay,
  MiniCalendarDays,
} from "@repo/ui/components/kibo-ui/mini-calendar";
import { format, isToday, subDays } from "@repo/ui/internal-lib/date-fns";
import { getLocalDate, parseLocalDate } from "@repo/ui/internal-lib/date-utils";
import { useEffect, useMemo, useState } from "react";

import { IconFlameFilled } from "@tabler/icons-react";
import type { UsersAPI } from "@/types/users.types";

interface StreakMiniCalendarProps {
  progressData: UsersAPI.Progress.GetMe.Response;
  className?: string;
}

function getTotalDaysToShow(): number {
  if (typeof window === "undefined") {
    return 7;
  }

  const width = window.innerWidth;

  if (width < 640) {
    return 7;
  } else if (width < 1024) {
    return 9;
  } else {
    return 10;
  }
}

export function StreakMiniCalendar({
  progressData,
  className,
}: StreakMiniCalendarProps) {
  const [totalDaysToShow, setTotalDaysToShow] = useState(() => getTotalDaysToShow());

  useEffect(() => {
    const handleResize = () => {
      setTotalDaysToShow(getTotalDaysToShow());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startDate = useMemo(() => {
    const today = getLocalDate(new Date());
    const daysBefore = Math.floor(totalDaysToShow / 2);
    const startDate = subDays(today, daysBefore);
    return getLocalDate(startDate);
  }, [totalDaysToShow]);

  const getDayStatus = (date: Date) => {
    const dateToCheck = getLocalDate(date);
    const today = getLocalDate(new Date());
    const isTodayDate = isToday(date);
    const dateStr = format(dateToCheck, "yyyy-MM-dd");
    const todayStr = format(today, "yyyy-MM-dd");

    if (dateStr === todayStr) {
      return {
        isValid: progressData.todayCallDuration.isValid,
        isToday: true,
      };
    }

    const isFutureDate = dateToCheck.getTime() > today.getTime();
    if (isFutureDate) {
      return { isValid: false, isToday: false };
    }

    const { currentStreak, lastValidDate } = progressData.streak;
    const { isValid: todayIsValid } = progressData.todayCallDuration;

    if (!lastValidDate || currentStreak === 0) {
      return { isValid: false, isToday: false };
    }

    const lastValid = parseLocalDate(lastValidDate);

    let streakEndDate: Date;
    if (todayIsValid) {
      streakEndDate = today;
    } else {
      streakEndDate = lastValid;
    }

    const streakStartDate = subDays(streakEndDate, currentStreak - 1);
    const streakStartLocal = getLocalDate(streakStartDate);
    const streakEndLocal = getLocalDate(streakEndDate);

    const isValid =
      dateToCheck.getTime() >= streakStartLocal.getTime() &&
      dateToCheck.getTime() <= streakEndLocal.getTime();

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
