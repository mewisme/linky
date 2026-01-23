export const REDIS_CACHE_KEYS = {
  userProfile: (userId: string) => `user:profile:${userId}`,
  userProgress: (userId: string) => `user:progress:${userId}`,
  userStreakCalendar: (userId: string, year: number, month: number) =>
    `user:streak:calendar:${userId}:${year}:${month}`,
  admin: (resource: string, filtersHash: string) => `admin:${resource}:${filtersHash}`,
  adminPrefix: (resource: string) => `admin:${resource}:`,
} as const;

