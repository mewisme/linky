export const REDIS_CACHE_KEYS = {
  userProfile: (userId: string) => `user:profile:${userId}`,
  userProgress: (userId: string, timezone: string) => `user:progress:${userId}:${timezone}`,
  userStreakCalendar: (userId: string, year: number, month: number, timezone: string) =>
    `user:streak:calendar:${userId}:${year}:${month}:${timezone}`,
  admin: (resource: string, filtersHash: string) => `admin:${resource}:${filtersHash}`,
  adminPrefix: (resource: string) => `admin:${resource}:`,
} as const;

