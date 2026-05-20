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
  },

  videoChat: {
    endCallUnload: () => `${V1}/video-chat/end-call-unload`,
    realtime: {
      session: () => `${V1}/video-chat/realtime/session`,
      publish: () => `${V1}/video-chat/realtime/publish`,
      subscribe: () => `${V1}/video-chat/realtime/subscribe`,
      renegotiate: () => `${V1}/video-chat/realtime/renegotiate`,
      cleanup: () => `${V1}/video-chat/realtime/cleanup`,
    },
  },

  matchmaking: {
    queueStatus: () => `${V1}/matchmaking/queue-status`,
  },

  resources: {
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
    aiConfig: () => `${V1}/admin/ai/config`,
    aiModels: (params?: URLSearchParams) => `${V1}/admin/ai/models${qs(params)}`,
    broadcasts: (params?: URLSearchParams) => `${V1}/admin/broadcasts${qs(params)}`,
    broadcastsAiGenerate: () => `${V1}/admin/broadcasts/ai-generate`,
    interestTags: (params?: URLSearchParams) => `${V1}/admin/interest-tags${qs(params)}`,
    interestTagById: (id: string) => `${V1}/admin/interest-tags/${id}`,
    interestTagHardDelete: (id: string) => `${V1}/admin/interest-tags/${id}/hard`,
    interestTagsImport: () => `${V1}/admin/interest-tags/import`,
    expBonuses: (params?: URLSearchParams) => `${V1}/admin/exp-bonuses${qs(params)}`,
    expBonusById: (id: string) => `${V1}/admin/exp-bonuses/${id}`,
    reports: (params?: URLSearchParams) => `${V1}/admin/reports${qs(params)}`,
    reportById: (id: string) => `${V1}/admin/reports/${id}`,
    users: (params?: URLSearchParams) => `${V1}/admin/users${qs(params)}`,
    usersBatch: () => `${V1}/admin/users/batch`,
    userById: (id: string) => `${V1}/admin/users/${id}`,
    embeddingsCompare: () => `${V1}/admin/embeddings/compare`,
    embeddingsSimilar: () => `${V1}/admin/embeddings/similar`,
    embeddingsSync: () => `${V1}/admin/embeddings/sync`,
    embeddingsSyncAll: () => `${V1}/admin/embeddings/sync-all`,
    s3PresignedUpload: (params?: URLSearchParams) => `${V1}/admin/s3/presigned/upload${qs(params)}`,
    s3PresignedDownload: (params?: URLSearchParams) => `${V1}/admin/s3/presigned/download${qs(params)}`,
    s3Objects: (params?: URLSearchParams) => `${V1}/admin/s3/objects${qs(params)}`,
    s3ObjectByKey: (key: string) => `${V1}/admin/s3/objects/${encodeURIComponent(key)}`,
    s3MultipartStart: () => `${V1}/admin/s3/multipart/start`,
    s3MultipartPart: (uploadId: string, partNumber: number, params?: URLSearchParams) =>
      `${V1}/admin/s3/multipart/${encodeURIComponent(uploadId)}/part/${partNumber}${qs(params)}`,
    s3MultipartComplete: () => `${V1}/admin/s3/multipart/complete`,
    s3MultipartAbort: () => `${V1}/admin/s3/multipart/abort`,
  },

  me: {
    s3PresignUpload: () => `${V1}/me/s3/presign-upload`,
    s3MultipartInitiate: () => `${V1}/me/s3/multipart/initiate`,
    s3MultipartSignPart: () => `${V1}/me/s3/multipart/sign-part`,
    s3MultipartComplete: () => `${V1}/me/s3/multipart/complete`,
    s3MultipartAbort: () => `${V1}/me/s3/multipart/abort`,
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

} as const;
