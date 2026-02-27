import { publicEnv } from "@/env/public-env";

const V1 = `${publicEnv.API_URL}/api/v1`;
const API = `${publicEnv.API_URL}/api`;

function qs(params?: URLSearchParams): string {
  if (!params) return '';
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const backendUrl = {
  users: {
    me: () => `${V1}/users/me`,
    meCountry: () => `${V1}/users/me/country`,
    details: () => `${V1}/user-details/me`,
    settings: () => `${V1}/user-settings/me`,
    progress: () => `${V1}/user-progress/me`,
    streak: () => `${V1}/user-streak/me`,
    streakCalendar: (params?: URLSearchParams) => `${V1}/user-streak/calendar${qs(params)}`,
    interestTags: () => `${V1}/user-details/me/interest-tags`,
    interestTagsAll: () => `${V1}/user-details/me/interest-tags/all`,
    blocks: () => `${V1}/users/blocks`,
    blocksMe: () => `${V1}/users/blocks/me`,
    blockByUserId: (userId: string) => `${V1}/users/blocks/${userId}`,
  },

  resources: {
    changelogs: (params?: URLSearchParams) => `${V1}/changelogs${qs(params)}`,
    changelogByVersion: (version: string) => `${V1}/changelogs/${version}`,
    callHistory: (params?: URLSearchParams) => `${V1}/call-history${qs(params)}`,
    callHistoryById: (id: string) => `${V1}/call-history/${id}`,
    favorites: (params?: URLSearchParams) => `${V1}/favorites${qs(params)}`,
    favoriteByUserId: (userId: string) => `${V1}/favorites/${userId}`,
    interestTags: (params?: URLSearchParams) => `${V1}/interest-tags${qs(params)}`,
    interestTagById: (id: string) => `${V1}/interest-tags/${id}`,
    reports: (params?: URLSearchParams) => `${V1}/reports${qs(params)}`,
    reportsMe: (params?: URLSearchParams) => `${V1}/reports/me${qs(params)}`,
  },

  admin: {
    broadcasts: (params?: URLSearchParams) => `${V1}/admin/broadcasts${qs(params)}`,
    changelogs: (params?: URLSearchParams) => `${V1}/admin/changelogs${qs(params)}`,
    changelogById: (id: string) => `${V1}/admin/changelogs/${id}`,
    interestTags: (params?: URLSearchParams) => `${V1}/admin/interest-tags${qs(params)}`,
    interestTagById: (id: string) => `${V1}/admin/interest-tags/${id}`,
    interestTagHardDelete: (id: string) => `${V1}/admin/interest-tags/${id}/hard`,
    interestTagsImport: () => `${V1}/admin/interest-tags/import`,
    levelFeatureUnlocks: (params?: URLSearchParams) => `${V1}/admin/level-feature-unlocks${qs(params)}`,
    levelFeatureUnlockById: (id: string) => `${V1}/admin/level-feature-unlocks/${id}`,
    levelRewards: (params?: URLSearchParams) => `${V1}/admin/level-rewards${qs(params)}`,
    levelRewardById: (id: string) => `${V1}/admin/level-rewards/${id}`,
    streakExpBonuses: (params?: URLSearchParams) => `${V1}/admin/streak-exp-bonuses${qs(params)}`,
    streakExpBonusById: (id: string) => `${V1}/admin/streak-exp-bonuses/${id}`,
    reports: (params?: URLSearchParams) => `${V1}/admin/reports${qs(params)}`,
    reportById: (id: string) => `${V1}/admin/reports/${id}`,
    users: (params?: URLSearchParams) => `${V1}/admin/users${qs(params)}`,
    userById: (id: string) => `${V1}/admin/users/${id}`,
    embeddingsCompare: () => `${V1}/admin/embeddings/compare`,
    embeddingsSimilar: () => `${V1}/admin/embeddings/similar`,
    embeddingsSync: () => `${V1}/admin/embeddings/sync`,
    mediaPresignedUpload: () => `${V1}/admin/media/presigned-upload`,
  },

  notifications: {
    me: (params?: URLSearchParams) => `${V1}/notifications/me${qs(params)}`,
    unreadCount: () => `${V1}/notifications/me/unread-count`,
    readAll: () => `${V1}/notifications/read-all`,
    readById: (id: string) => `${V1}/notifications/${id}/read`,
  },

  push: {
    subscribe: () => `${V1}/push/subscribe`,
    unsubscribe: () => `${V1}/push/unsubscribe`,
    vapidPublicKey: () => `${V1}/push/vapid-public-key`,
  },

  media: {
    iceServers: () => `${API}/ice-servers`,
  },

  matchmaking: {
    queueStatus: () => `${V1}/matchmaking/queue-status`,
  },
} as const;
