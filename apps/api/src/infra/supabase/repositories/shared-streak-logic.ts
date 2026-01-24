export interface SharedStreakExisting {
  last_valid_date: string | null;
  current_streak: number;
  longest_streak: number;
}

export function computeNewSharedStreakCount(
  existing: SharedStreakExisting,
  callerLocalDateStr: string,
): { newCurrent: number; newLongest: number } {
  const last = existing.last_valid_date;
  if (!last) {
    return {
      newCurrent: 1,
      newLongest: Math.max(1, existing.longest_streak),
    };
  }
  const lastDate = new Date(last + "T12:00:00Z").getTime();
  const thisDate = new Date(callerLocalDateStr + "T12:00:00Z").getTime();
  const diffDays = Math.round((thisDate - lastDate) / 86400000);
  if (diffDays === 1) {
    const newCurrent = existing.current_streak + 1;
    return {
      newCurrent,
      newLongest: Math.max(existing.longest_streak, newCurrent),
    };
  }
  return {
    newCurrent: 1,
    newLongest: existing.longest_streak,
  };
}
