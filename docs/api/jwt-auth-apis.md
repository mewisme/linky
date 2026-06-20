# JWT Authenticated APIs

JWT means Clerk bearer token authentication through `middleware.Clerk()`.

## Authorization Header

| Name | Required | Description |
|---|---:|---|
| `Authorization` | Yes | `Bearer <clerk_jwt>` |

Source: `apps/api/src/internal/transport/http/middleware/clerk.go`.

## User JWT APIs

Required role/permission: authenticated Clerk user. No role check found in code.

| Method | Path | Related middleware/guard |
|---:|---|---|
| GET | `/api/v1/users/me` | `middleware.Clerk()` |
| PATCH | `/api/v1/users/me/country` | `middleware.Clerk()` |
| PATCH | `/api/v1/users/timezone` | `middleware.Clerk()` |
| GET | `/api/v1/users/level/me` | `middleware.Clerk()` |
| GET | `/api/v1/users/streak/me` | `middleware.Clerk()` |
| GET | `/api/v1/users/streak/me/history` | `middleware.Clerk()` |
| GET | `/api/v1/users/streak/calendar` | `middleware.Clerk()` |
| GET | `/api/v1/users/progress/me` | `middleware.Clerk()` |
| GET | `/api/v1/users/blocks/me` | `middleware.Clerk()` |
| POST | `/api/v1/users/blocks` | `middleware.Clerk()` |
| DELETE | `/api/v1/users/blocks/:blocked_user_id` | `middleware.Clerk()` |
| GET | `/api/v1/users/details/me` | `middleware.Clerk()` |
| PUT | `/api/v1/users/details/me` | `middleware.Clerk()` |
| PATCH | `/api/v1/users/details/me` | `middleware.Clerk()` |
| POST | `/api/v1/users/details/me/interest-tags` | `middleware.Clerk()` |
| DELETE | `/api/v1/users/details/me/interest-tags` | `middleware.Clerk()` |
| PUT | `/api/v1/users/details/me/interest-tags` | `middleware.Clerk()` |
| DELETE | `/api/v1/users/details/me/interest-tags/all` | `middleware.Clerk()` |
| GET | `/api/v1/users/settings/me` | `middleware.Clerk()` |
| PUT | `/api/v1/users/settings/me` | `middleware.Clerk()` |
| PATCH | `/api/v1/users/settings/me` | `middleware.Clerk()` |
| GET | `/api/v1/users/profile/me` | `middleware.Clerk()` |
| GET | `/api/v1/call-history` | `middleware.Clerk()` |
| GET | `/api/v1/call-history/:id` | `middleware.Clerk()` |
| POST | `/api/v1/call-history` | `middleware.Clerk()` |
| GET | `/api/v1/reports` | `middleware.Clerk()` |
| POST | `/api/v1/reports` | `middleware.Clerk()` |
| GET | `/api/v1/reports/me` | `middleware.Clerk()` |
| GET | `/api/v1/favorites` | `middleware.Clerk()` |
| POST | `/api/v1/favorites` | `middleware.Clerk()` |
| DELETE | `/api/v1/favorites/:favorite_user_id` | `middleware.Clerk()` |
| POST | `/api/v1/video-chat/end-call-unload` | `middleware.Clerk()`, `CustomRateLimit(10000, 5, true)` |
| POST | `/api/v1/video-chat/realtime/session` | `middleware.Clerk()`, `CustomRateLimit(10000, 30, false)` |
| POST | `/api/v1/video-chat/realtime/publish` | `middleware.Clerk()`, `CustomRateLimit(10000, 30, false)` |
| POST | `/api/v1/video-chat/realtime/subscribe` | `middleware.Clerk()`, `CustomRateLimit(10000, 30, false)` |
| PUT | `/api/v1/video-chat/realtime/renegotiate` | `middleware.Clerk()`, `CustomRateLimit(10000, 30, false)` |
| POST | `/api/v1/video-chat/realtime/cleanup` | `middleware.Clerk()`, `CustomRateLimit(10000, 30, false)` |
| GET | `/api/v1/notifications/me` | `middleware.Clerk()` |
| GET | `/api/v1/notifications/me/unread-count` | `middleware.Clerk()` |
| PATCH | `/api/v1/notifications/:id/read` | `middleware.Clerk()` |
| PATCH | `/api/v1/notifications/read-all` | `middleware.Clerk()` |
| POST | `/api/v1/push/subscribe` | `middleware.Clerk()` |
| DELETE | `/api/v1/push/unsubscribe` | `middleware.Clerk()` |
| GET | `/api/v1/push/vapid-public-key` | `middleware.Clerk()` |
| POST | `/api/v1/me/s3/presign-upload` | `middleware.Clerk()` |
| POST | `/api/v1/me/s3/multipart/initiate` | `middleware.Clerk()` |
| POST | `/api/v1/me/s3/multipart/sign-part` | `middleware.Clerk()` |
| POST | `/api/v1/me/s3/multipart/complete` | `middleware.Clerk()` |
| POST | `/api/v1/me/s3/multipart/abort` | `middleware.Clerk()` |

## Admin JWT APIs

Required role/permission: `admin` or `superadmin`, checked by `middleware.Admin()` through `admincache.IsAdmin`.

Related guard files:

- `apps/api/src/internal/transport/http/middleware/clerk.go`
- `apps/api/src/internal/transport/http/middleware/admin.go`
- `apps/api/src/internal/infra/admincache/admincache.go`

| Method | Path | Required role/permission |
|---:|---|---|
| GET | `/api/v1/admin/config` | `admin` or `superadmin` |
| GET | `/api/v1/admin/config/:key` | `admin` or `superadmin` |
| POST | `/api/v1/admin/config` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/config/:key` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/config/:key` | `admin` or `superadmin` |
| GET | `/api/v1/admin/ai/config` | `admin` or `superadmin` |
| PUT | `/api/v1/admin/ai/config` | `admin` or `superadmin` |
| GET | `/api/v1/admin/ai/models` | `admin` or `superadmin` |
| GET | `/api/v1/admin/users` | `admin` or `superadmin` |
| GET | `/api/v1/admin/users/:id` | `admin` or `superadmin` |
| PUT | `/api/v1/admin/users/:id` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/users/:id` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/users/batch` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/users/batch` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/users/:id` | `admin` or `superadmin` |
| GET | `/api/v1/admin/users/clerk` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/users/clerk/batch` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/users/clerk/batch` | `admin` or `superadmin` |
| POST | `/api/v1/admin/users/clerk/:id/password/set-compromised` | `admin` or `superadmin` |
| POST | `/api/v1/admin/users/clerk/:id/password/unset-compromised` | `admin` or `superadmin` |
| GET | `/api/v1/admin/users/clerk/:id` | `admin` or `superadmin` |
| PUT | `/api/v1/admin/users/clerk/:id` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/users/clerk/:id` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/users/clerk/:id` | `admin` or `superadmin` |
| GET | `/api/v1/admin/interest-tags` | `admin` or `superadmin` |
| GET | `/api/v1/admin/interest-tags/:id` | `admin` or `superadmin` |
| POST | `/api/v1/admin/interest-tags` | `admin` or `superadmin` |
| PUT | `/api/v1/admin/interest-tags/:id` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/interest-tags/:id` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/interest-tags/:id` | `admin` or `superadmin` |
| POST | `/api/v1/admin/interest-tags/import` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/interest-tags/:id/hard` | `admin` or `superadmin` |
| GET | `/api/v1/admin/exp-bonuses` | `admin` or `superadmin` |
| GET | `/api/v1/admin/exp-bonuses/:id` | `admin` or `superadmin` |
| POST | `/api/v1/admin/exp-bonuses` | `admin` or `superadmin` |
| PUT | `/api/v1/admin/exp-bonuses/:id` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/exp-bonuses/:id` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/exp-bonuses/:id` | `admin` or `superadmin` |
| GET | `/api/v1/admin/broadcasts` | `admin` or `superadmin` |
| POST | `/api/v1/admin/broadcasts` | `admin` or `superadmin` |
| POST | `/api/v1/admin/broadcasts/ai-generate` | `admin` or `superadmin` |
| GET | `/api/v1/admin/embeddings` | `admin` or `superadmin` |
| POST | `/api/v1/admin/embeddings/regenerate` | `admin` or `superadmin` |
| POST | `/api/v1/admin/embeddings/sync` | `admin` or `superadmin` |
| POST | `/api/v1/admin/embeddings/sync-all` | `admin` or `superadmin` |
| POST | `/api/v1/admin/embeddings/compare` | `admin` or `superadmin` |
| POST | `/api/v1/admin/embeddings/similar` | `admin` or `superadmin` |
| POST | `/api/v1/admin/s3/presign-upload` | `admin` or `superadmin` |
| POST | `/api/v1/admin/s3/presign-download` | `admin` or `superadmin` |
| POST | `/api/v1/admin/s3/delete` | `admin` or `superadmin` |
| GET | `/api/v1/admin/s3/presigned/upload` | `admin` or `superadmin` |
| GET | `/api/v1/admin/s3/presigned/download` | `admin` or `superadmin` |
| GET | `/api/v1/admin/s3/objects` | `admin` or `superadmin` |
| DELETE | `/api/v1/admin/s3/objects/:key` | `admin` or `superadmin` |
| POST | `/api/v1/admin/s3/multipart/start` | `admin` or `superadmin` |
| GET | `/api/v1/admin/s3/multipart/:uploadId/part/:partNumber` | `admin` or `superadmin` |
| POST | `/api/v1/admin/s3/multipart/complete` | `admin` or `superadmin` |
| POST | `/api/v1/admin/s3/multipart/abort` | `admin` or `superadmin` |
| GET | `/api/v1/admin/reports` | `admin` or `superadmin` |
| GET | `/api/v1/admin/reports/:id` | `admin` or `superadmin` |
| PATCH | `/api/v1/admin/reports/:id` | `admin` or `superadmin` |
| POST | `/api/v1/admin/reports/:id/ai-summary` | `admin` or `superadmin` |
| POST | `/api/v1/admin/reports/:id/ai-summary:generate` | `admin` or `superadmin` |
