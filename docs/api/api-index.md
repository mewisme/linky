# API Index

Source of truth: `apps/api/src/internal/server/server.go` and registered Echo routes under `apps/api/src/internal/transport/http`.

## Global Behavior

All routes use request ID, client IP capture, access logging, CORS, body limit, recovery, and gzip middleware. See `api-errors.md` for shared response envelopes and middleware details.

Authentication is Clerk JWT bearer auth on groups mounted with `middleware.Clerk()`. Admin routes also use `middleware.Admin()` and `middleware.RateLimit()`.

## Public APIs

| Group | Method | Path | Handler |
|---|---:|---|---|
| Root and health | GET | `/` | inline in `RegisterRoot` |
| Root and health | GET | `/api` | inline in `RegisterRoot` |
| Root and health | GET | `/healthz` | inline in `RegisterHealth` |
| Root and health | GET | `/readyz` | inline in `RegisterHealth` |
| Webhook | POST | `/webhook/clerk` | inline in `RegisterWebhook` |
| Interest tags | GET | `/api/v1/interest-tags` | inline in `RegisterInterestTagsPublic` |
| Interest tags | GET | `/api/v1/interest-tags/:id` | inline in `RegisterInterestTagsPublic` |
| Matchmaking | GET | `/api/v1/matchmaking/queue-status` | inline in `RegisterQueueStatus` |

## JWT APIs

| Group | Method | Path | Handler |
|---|---:|---|---|
| Users | GET | `/api/v1/users/me` | `handleUserMe` |
| Users | PATCH | `/api/v1/users/me/country` | `handleUpdateMeCountry` |
| Users | PATCH | `/api/v1/users/timezone` | `handleUpdateTimezone` |
| Users | GET | `/api/v1/users/level/me` | `handleUserLevelMe` |
| Users | GET | `/api/v1/users/streak/me` | `handleUserStreakMe` |
| Users | GET | `/api/v1/users/streak/me/history` | `handleStreakHistory` |
| Users | GET | `/api/v1/users/streak/calendar` | `handleStreakCalendar` |
| Users | GET | `/api/v1/users/progress/me` | `handleUserProgressMe` |
| Users | GET | `/api/v1/users/blocks/me` | `handleBlocksMe` |
| Users | POST | `/api/v1/users/blocks` | `handleCreateBlock` |
| Users | DELETE | `/api/v1/users/blocks/:blocked_user_id` | `handleDeleteBlock` |
| Users | GET | `/api/v1/users/details/me` | `handleUserDetailsGet` |
| Users | PUT | `/api/v1/users/details/me` | `handleUserDetailsPut` |
| Users | PATCH | `/api/v1/users/details/me` | `handleUserDetailsPatch` |
| Users | POST | `/api/v1/users/details/me/interest-tags` | `handleAddInterestTags` |
| Users | DELETE | `/api/v1/users/details/me/interest-tags` | `handleRemoveInterestTags` |
| Users | PUT | `/api/v1/users/details/me/interest-tags` | `handleReplaceInterestTags` |
| Users | DELETE | `/api/v1/users/details/me/interest-tags/all` | `handleClearInterestTags` |
| Users | GET | `/api/v1/users/settings/me` | `handleUserSettingsGet` |
| Users | PUT | `/api/v1/users/settings/me` | `handleUserSettingsPut` |
| Users | PATCH | `/api/v1/users/settings/me` | `handleUserSettingsPut` |
| Users | GET | `/api/v1/users/profile/me` | `handleUserProfileGet` |
| Call history | GET | `/api/v1/call-history` | `handleListCallHistory` |
| Call history | GET | `/api/v1/call-history/:id` | `handleGetCallHistoryItem` |
| Call history | POST | `/api/v1/call-history` | `handleCreateCallHistory` |
| Reports | GET | `/api/v1/reports` | `handleListReports` |
| Reports | POST | `/api/v1/reports` | `handleCreateReport` |
| Reports | GET | `/api/v1/reports/me` | `handleListReports` |
| Favorites | GET | `/api/v1/favorites` | `handleListFavorites` |
| Favorites | POST | `/api/v1/favorites` | `handleCreateFavorite` |
| Favorites | DELETE | `/api/v1/favorites/:favorite_user_id` | `handleDeleteFavorite` |
| Video chat | POST | `/api/v1/video-chat/end-call-unload` | `handleEndCallUnload` |
| Video chat | POST | `/api/v1/video-chat/realtime/session` | `handleRealtimeSession` |
| Video chat | POST | `/api/v1/video-chat/realtime/publish` | `handleRealtimePublish` |
| Video chat | POST | `/api/v1/video-chat/realtime/subscribe` | `handleRealtimeSubscribe` |
| Video chat | PUT | `/api/v1/video-chat/realtime/renegotiate` | `handleRealtimeRenegotiate` |
| Video chat | POST | `/api/v1/video-chat/realtime/cleanup` | `handleRealtimeCleanup` |
| Notifications | GET | `/api/v1/notifications/me` | `handleListNotifications` |
| Notifications | GET | `/api/v1/notifications/me/unread-count` | `handleUnreadCount` |
| Notifications | PATCH | `/api/v1/notifications/:id/read` | `handleMarkRead` |
| Notifications | PATCH | `/api/v1/notifications/read-all` | `handleMarkAllRead` |
| Push | POST | `/api/v1/push/subscribe` | inline in `registerPushRoutes` |
| Push | DELETE | `/api/v1/push/unsubscribe` | inline in `registerPushRoutes` |
| Push | GET | `/api/v1/push/vapid-public-key` | inline in `registerPushRoutes` |
| Me S3 | POST | `/api/v1/me/s3/presign-upload` | `handleMyPresignUpload` |
| Me S3 | POST | `/api/v1/me/s3/multipart/initiate` | `handleMultipartInitiate` |
| Me S3 | POST | `/api/v1/me/s3/multipart/sign-part` | `handleMultipartSignPart` |
| Me S3 | POST | `/api/v1/me/s3/multipart/complete` | `handleMultipartComplete` |
| Me S3 | POST | `/api/v1/me/s3/multipart/abort` | `handleMultipartAbort` |

## Admin JWT APIs

All admin APIs require Clerk JWT plus admin or superadmin role. Middleware: `middleware.Clerk()`, `middleware.Admin()`, `middleware.RateLimit(cfg)`.

| Admin module | Method | Path | Handler |
|---|---:|---|---|
| Config | GET | `/api/v1/admin/config` | `handleAdminConfigList` |
| Config | GET | `/api/v1/admin/config/:key` | `handleAdminConfigGet` |
| Config | POST | `/api/v1/admin/config` | `handleAdminConfigPost` |
| Config | PATCH | `/api/v1/admin/config/:key` | `handleAdminConfigUpsert` |
| Config | DELETE | `/api/v1/admin/config/:key` | `handleAdminConfigDelete` |
| AI config | GET | `/api/v1/admin/ai/config` | `handleAdminAIConfigGet` |
| AI config | PUT | `/api/v1/admin/ai/config` | `handleAdminAIConfigPut` |
| AI config | GET | `/api/v1/admin/ai/models` | `handleAdminAIModelsList` |
| Users | GET | `/api/v1/admin/users` | `handleAdminUserList` |
| Users | GET | `/api/v1/admin/users/:id` | `handleAdminUserGet` |
| Users | PUT | `/api/v1/admin/users/:id` | `handleAdminUserPut` |
| Users | PATCH | `/api/v1/admin/users/:id` | `handleAdminUserPatch` |
| Users | PATCH | `/api/v1/admin/users/batch` | `handleAdminUserBatchPatch` |
| Users | DELETE | `/api/v1/admin/users/batch` | `handleAdminUserBatchDelete` |
| Users | DELETE | `/api/v1/admin/users/:id` | `handleAdminUserSoftDelete` |
| Clerk users | GET | `/api/v1/admin/users/clerk` | `handleAdminClerkUserList` |
| Clerk users | PATCH | `/api/v1/admin/users/clerk/batch` | `handleAdminClerkUserBatchPatch` |
| Clerk users | DELETE | `/api/v1/admin/users/clerk/batch` | `handleAdminClerkUserBatchDelete` |
| Clerk users | POST | `/api/v1/admin/users/clerk/:id/password/set-compromised` | `handleAdminClerkUserSetPasswordCompromised` |
| Clerk users | POST | `/api/v1/admin/users/clerk/:id/password/unset-compromised` | `handleAdminClerkUserUnsetPasswordCompromised` |
| Clerk users | GET | `/api/v1/admin/users/clerk/:id` | `handleAdminClerkUserGet` |
| Clerk users | PUT | `/api/v1/admin/users/clerk/:id` | `handleAdminClerkUserPut` |
| Clerk users | PATCH | `/api/v1/admin/users/clerk/:id` | `handleAdminClerkUserPatch` |
| Clerk users | DELETE | `/api/v1/admin/users/clerk/:id` | `handleAdminClerkUserDelete` |
| Interest tags | GET | `/api/v1/admin/interest-tags` | inline in `registerAdminCRUD` |
| Interest tags | GET | `/api/v1/admin/interest-tags/:id` | inline in `registerAdminCRUD` |
| Interest tags | POST | `/api/v1/admin/interest-tags` | inline in `registerAdminCRUD` |
| Interest tags | PUT | `/api/v1/admin/interest-tags/:id` | inline in `registerAdminCRUD` |
| Interest tags | PATCH | `/api/v1/admin/interest-tags/:id` | inline in `registerAdminCRUD` |
| Interest tags | DELETE | `/api/v1/admin/interest-tags/:id` | inline in `registerAdminCRUD` |
| Interest tags | POST | `/api/v1/admin/interest-tags/import` | `handleAdminImportInterestTags` |
| Interest tags | DELETE | `/api/v1/admin/interest-tags/:id/hard` | `handleAdminInterestTagHardDelete` |
| EXP bonuses | GET | `/api/v1/admin/exp-bonuses` | inline in `registerAdminCRUD` |
| EXP bonuses | GET | `/api/v1/admin/exp-bonuses/:id` | inline in `registerAdminCRUD` |
| EXP bonuses | POST | `/api/v1/admin/exp-bonuses` | inline in `registerAdminCRUD` |
| EXP bonuses | PUT | `/api/v1/admin/exp-bonuses/:id` | inline in `registerAdminCRUD` |
| EXP bonuses | PATCH | `/api/v1/admin/exp-bonuses/:id` | inline in `registerAdminCRUD` |
| EXP bonuses | DELETE | `/api/v1/admin/exp-bonuses/:id` | inline in `registerAdminCRUD` |
| Broadcasts | GET | `/api/v1/admin/broadcasts` | `handleAdminBroadcastsList` |
| Broadcasts | POST | `/api/v1/admin/broadcasts` | `handleAdminBroadcastsCreate` |
| Broadcasts | POST | `/api/v1/admin/broadcasts/ai-generate` | `handleAdminBroadcastAIGenerate` |
| Embeddings | GET | `/api/v1/admin/embeddings` | `handleAdminEmbeddings` |
| Embeddings | POST | `/api/v1/admin/embeddings/regenerate` | `handleAdminEmbeddingsRegenerate` |
| Embeddings | POST | `/api/v1/admin/embeddings/sync` | `handleAdminEmbeddingsSync` |
| Embeddings | POST | `/api/v1/admin/embeddings/sync-all` | `handleAdminEmbeddingsSyncAll` |
| Embeddings | POST | `/api/v1/admin/embeddings/compare` | `handleAdminEmbeddingsCompare` |
| Embeddings | POST | `/api/v1/admin/embeddings/similar` | `handleAdminEmbeddingsSimilar` |
| S3 | POST | `/api/v1/admin/s3/presign-upload` | `handleAdminS3PresignUpload` |
| S3 | POST | `/api/v1/admin/s3/presign-download` | `handleAdminS3PresignDownload` |
| S3 | POST | `/api/v1/admin/s3/delete` | `handleAdminS3Delete` |
| S3 | GET | `/api/v1/admin/s3/presigned/upload` | `handleAdminS3PresignUploadGET` |
| S3 | GET | `/api/v1/admin/s3/presigned/download` | `handleAdminS3PresignDownloadGET` |
| S3 | GET | `/api/v1/admin/s3/objects` | `handleAdminS3ListObjects` |
| S3 | DELETE | `/api/v1/admin/s3/objects/:key` | `handleAdminS3ObjectDelete` |
| S3 | POST | `/api/v1/admin/s3/multipart/start` | `handleAdminS3MultipartStart` |
| S3 | GET | `/api/v1/admin/s3/multipart/:uploadId/part/:partNumber` | `handleAdminS3MultipartSignPart` |
| S3 | POST | `/api/v1/admin/s3/multipart/complete` | `handleAdminS3MultipartComplete` |
| S3 | POST | `/api/v1/admin/s3/multipart/abort` | `handleAdminS3MultipartAbort` |
| Reports | GET | `/api/v1/admin/reports` | `handleAdminReportsList` |
| Reports | GET | `/api/v1/admin/reports/:id` | `handleAdminReportGet` |
| Reports | PATCH | `/api/v1/admin/reports/:id` | `handleAdminReportPatch` |
| Reports | POST | `/api/v1/admin/reports/:id/ai-summary` | `handleAdminReportAISummary` |
| Reports | POST | `/api/v1/admin/reports/:id/ai-summary:generate` | `handleAdminReportAISummaryGenerate` |

## Group Files

- `groups/root-health.md`
- `groups/webhook.md`
- `groups/interest-tags.md`
- `groups/matchmaking.md`
- `groups/users.md`
- `groups/call-history.md`
- `groups/reports.md`
- `groups/favorites.md`
- `groups/video-chat.md`
- `groups/notifications.md`
- `groups/push.md`
- `groups/me-s3.md`
- `groups/admin.md`
