export const CACHE_TTL = {
  REFERENCE_DATA: 24 * 60 * 60,
  INTEREST_TAGS: 24 * 60 * 60,
  USER_DATA: 15 * 60,
  USER_DETAILS: 15 * 60,
  USER_SETTINGS: 15 * 60,
  USER_FAVORITES: 15 * 60,
  USER_REPORTS: 15 * 60,
  CALL_HISTORY: 15 * 60,
} as const;

export const CACHE_KEYS = {
  interestTags: () => "ref:interest-tags",
  interestTag: (id: string) => `ref:interest-tag:${id}`,

  userDetails: (userId: string) => `user:details:${userId}`,
  userSettings: (userId: string) => `user:settings:${userId}`,
  userFavorites: (userId: string) => `user:favorites:${userId}`,
  userReports: (userId: string) => `user:reports:${userId}`,
  callHistory: (userId: string) => `user:call-history:${userId}`,
  callHistoryItem: (callId: string) => `call-history:item:${callId}`,
} as const;