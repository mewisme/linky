import { publicEnv } from "@/shared/env/public-env";

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
    timezone: () => `${V1}/users/timezone`,
    details: () => `${V1}/users/details/me`,
    settings: () => `${V1}/users/settings/me`,
    profile: () => `${V1}/users/profile/me`,
    level: () => `${V1}/users/level/me`,
    progress: () => `${V1}/users/progress/me`,
    streak: () => `${V1}/users/streak/me`,
    streakHistory: (params?: URLSearchParams) => `${V1}/users/streak/me/history${qs(params)}`,
    streakCalendar: (params?: URLSearchParams) => `${V1}/users/streak/calendar${qs(params)}`,
    interestTags: () => `${V1}/users/details/me/interest-tags`,
    interestTagsAll: () => `${V1}/users/details/me/interest-tags/all`,
    blocks: () => `${V1}/users/blocks`,
    blocksMe: () => `${V1}/users/blocks/me`,
    blockByUserId: (userId: string) => `${V1}/users/blocks/${userId}`,
    prestige: () => `${V1}/users/prestige`,
  },

  economy: {
    wallet: () => `${V1}/economy/wallet`,
    convert: () => `${V1}/economy/convert`,
    daily: {
      progress: (params?: URLSearchParams) => `${V1}/economy/daily/progress${qs(params)}`,
    },
    weekly: {
      progress: (params?: URLSearchParams) => `${V1}/economy/weekly/progress${qs(params)}`,
      checkin: () => `${V1}/economy/weekly/checkin`,
    },
    monthly: {
      progress: (params?: URLSearchParams) => `${V1}/economy/monthly/progress${qs(params)}`,
      checkin: () => `${V1}/economy/monthly/checkin`,
      buyback: () => `${V1}/economy/monthly/buyback`,
    },
    shop: {
      list: (params?: URLSearchParams) => `${V1}/economy/shop${qs(params)}`,
      purchase: () => `${V1}/economy/shop/purchase`,
    },
    boost: {
      active: () => `${V1}/economy/boost/active`,
      purchase: () => `${V1}/economy/boost/purchase`,
    },
  },

  videoChat: {
    endCallUnload: () => `${V1}/video-chat/end-call-unload`,
  },

  matchmaking: {
    queueStatus: () => `${V1}/matchmaking/queue-status`,
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
    config: () => `${V1}/admin/config`,
    configByKey: (key: string) => `${V1}/admin/config/${encodeURIComponent(key)}`,
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
    favoriteExpBoost: (params?: URLSearchParams) => `${V1}/admin/favorite-exp-boost${qs(params)}`,
    favoriteExpBoostById: (id: string) => `${V1}/admin/favorite-exp-boost/${id}`,
    streakExpBonuses: (params?: URLSearchParams) => `${V1}/admin/streak-exp-bonuses${qs(params)}`,
    streakExpBonusById: (id: string) => `${V1}/admin/streak-exp-bonuses/${id}`,
    reports: (params?: URLSearchParams) => `${V1}/admin/reports${qs(params)}`,
    reportById: (id: string) => `${V1}/admin/reports/${id}`,
    users: (params?: URLSearchParams) => `${V1}/admin/users${qs(params)}`,
    usersBatch: () => `${V1}/admin/users/batch`,
    userById: (id: string) => `${V1}/admin/users/${id}`,
    economyStats: (params?: URLSearchParams) => `${V1}/admin/economy/stats${qs(params)}`,
    economySimulate: () => `${V1}/admin/economy/simulate`,
    seasons: (params?: URLSearchParams) => `${V1}/admin/seasons${qs(params)}`,
    seasonById: (id: string) => `${V1}/admin/seasons/${id}`,
    seasonForceDecay: (id: string) => `${V1}/admin/seasons/${id}/force-decay`,
    embeddingsCompare: () => `${V1}/admin/embeddings/compare`,
    embeddingsSimilar: () => `${V1}/admin/embeddings/similar`,
    embeddingsSync: () => `${V1}/admin/embeddings/sync`,
    embeddingsSyncAll: () => `${V1}/admin/embeddings/sync-all`,
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

} as const;


