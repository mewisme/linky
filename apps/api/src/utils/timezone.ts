export function isValidTimezone(tz: string): boolean {
  if (typeof tz !== "string" || tz.trim() === "") {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function toUserLocalDateString(utcDate: Date, timezone: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(utcDate);
}
