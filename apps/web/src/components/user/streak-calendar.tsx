"use client";

import {
  CalendarDate,
  CalendarDatePagination,
  CalendarHeader,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  useCalendarMonth,
  useCalendarYear,
} from "@repo/ui/components/kibo-ui/calendar";
import { format, getDay, getDaysInMonth, isToday } from "@repo/ui/internal-lib/date-fns";
import { useEffect, useMemo, useState } from "react";

import { IconFlameFilled } from "@tabler/icons-react";
import type { UsersAPI } from "@/types/users.types";
import { cn } from "@repo/ui/lib/utils";
import { getUserTimezone } from "@/utils/timezone";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/components/providers/user/user-provider";

interface StreakCalendarProps {
  className?: string;
}

export function StreakCalendar({ className }: StreakCalendarProps) {
  const { state } = useUserContext();
  const [token, setToken] = useState<string | null>(null);
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken();
      setToken(token);
    };
    fetchToken();
  }, [state]);

  const monthNumber = month + 1;

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ["streak-calendar", year, monthNumber],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      const res = await fetch(
        `/api/users/streak/calendar?year=${year}&month=${monthNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-timezone": getUserTimezone(),
          },
        }
      );
      if (!res.ok) throw new Error("Failed to load calendar data");
      return res.json() as Promise<UsersAPI.Streak.Calendar.Response>;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const streakDaysMap = useMemo(() => {
    const map = new Map<string, UsersAPI.Streak.Calendar.Day>();
    if (calendarData) {
      for (const day of calendarData) {
        map.set(day.date, day);
      }
    }
    return map;
  }, [calendarData]);

  const currentMonthDate = useMemo(
    () => new Date(year, month, 1),
    [year, month]
  );
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonthDate),
    [currentMonthDate]
  );
  const firstDay = useMemo(
    () => (getDay(currentMonthDate) - 0 + 7) % 7,
    [currentMonthDate]
  );

  const prevMonthData = useMemo(() => {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthDays = getDaysInMonth(new Date(prevMonthYear, prevMonth, 1));
    const prevMonthDaysArray = Array.from(
      { length: prevMonthDays },
      (_, i) => i + 1
    );
    return { prevMonthDays, prevMonthDaysArray };
  }, [month, year]);

  const nextMonthData = useMemo(() => {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthDays = getDaysInMonth(new Date(nextMonthYear, nextMonth, 1));
    const nextMonthDaysArray = Array.from(
      { length: nextMonthDays },
      (_, i) => i + 1
    );
    return { nextMonthDaysArray };
  }, [month, year]);

  const getDayData = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = format(date, "yyyy-MM-dd");
    return streakDaysMap.get(dateStr);
  };

  const days: React.ReactNode[] = [];

  for (let i = 0; i < firstDay; i++) {
    const day =
      prevMonthData.prevMonthDaysArray[
      prevMonthData.prevMonthDays - firstDay + i
      ];

    if (day) {
      days.push(
        <div
          className="relative h-full w-full bg-secondary p-1 text-muted-foreground text-xs"
          key={`prev-${i}`}
        >
          {day}
        </div>
      );
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayData = getDayData(day);
    const date = new Date(year, month, day);
    const isTodayDate = isToday(date);

    days.push(
      <div
        className={cn(
          "relative flex h-full w-full flex-col gap-1 p-1 text-xs",
          isTodayDate && "bg-accent"
        )}
        key={day}
      >
        <span className={cn("text-muted-foreground", isTodayDate && "font-semibold")}>
          {day}
        </span>
        {dayData && (
          <div className="absolute top-1 right-1">
            {dayData.isValid ? (
              <IconFlameFilled className="h-4 w-4 text-orange-500" />
            ) : dayData.isToday ? (
              <IconFlameFilled className="h-4 w-4 text-muted-foreground" />
            ) : <></>}
          </div>
        )}
      </div>
    );
  }

  const remainingDays = 7 - ((firstDay + daysInMonth) % 7);
  if (remainingDays < 7) {
    for (let i = 0; i < remainingDays; i++) {
      const day = nextMonthData.nextMonthDaysArray[i];

      if (day) {
        days.push(
          <div
            className="relative h-full w-full bg-secondary p-1 text-muted-foreground text-xs"
            key={`next-${i}`}
          >
            {day}
          </div>
        );
      }
    }
  }

  return (
    <CalendarProvider className={className}>
      <CalendarDate>
        <CalendarDatePagination />
        <CalendarMonthPicker />
        <CalendarYearPicker start={2025} end={new Date().getFullYear() + 5} className="max-w-24" />
      </CalendarDate>
      <CalendarHeader />
      <div className="grid grow grid-cols-7">
        {isLoading ? (
          <div className="col-span-7 flex items-center justify-center p-8">
            <span className="text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : (
          days.map((day, index) => (
            <div
              className={cn(
                "relative aspect-square overflow-hidden border-t border-r",
                index % 7 === 6 && "border-r-0"
              )}
              key={index}
            >
              {day}
            </div>
          ))
        )}
      </div>
    </CalendarProvider>
  );
}
