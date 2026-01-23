import { toZonedTime } from "./date-fns-tz";

export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }
  
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return toZonedTime(utcDate, localTimezone);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDate(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(year, month, day, 0, 0, 0, 0);
}
