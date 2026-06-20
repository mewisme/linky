# API Types

This file lists shared request, response, enum, and DTO shapes found in backend code. For handlers that return raw `map[string]any` from Supabase or upstream services, exact fields are marked as not found in code.

## Auth

Source: `apps/api/src/internal/httpx/context.go`

```json
{
  "sub": "clerk_user_id",
  "raw": {}
}
```

`sub` comes from verified Clerk token claims and is stored in Echo context as `AuthClaims.Sub`. `raw` is the verified token payload map.

## User Message

Source: `apps/api/src/internal/httpx/user_message.go`

```json
{
  "code": "STRING_CODE",
  "i18n": {
    "key": "api.someKey",
    "values": {}
  },
  "fallbackMessage": "Readable fallback"
}
```

## Pagination Shapes

### Limit Offset Envelope

Used by call history, reports, and generic admin lists.

```json
{
  "data": [],
  "count": 0,
  "limit": 50,
  "offset": 0
}
```

Some endpoints omit `limit` and `offset` and only return `data` plus `count`.

### Pagination Object Envelope

Used by public interest tags and admin broadcasts.

```json
{
  "data": [],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 0,
    "totalPages": 0
  }
}
```

## Roles

Source: `apps/api/src/internal/infra/admincache/admincache.go`

| Value | Meaning |
|---|---|
| `admin` | Accepted by admin middleware. |
| `superadmin` | Accepted by admin middleware. |

`middleware.Admin()` checks `admincache.IsAdmin`, which accepts only `admin` and `superadmin`.

## UserRow

Source: `apps/api/src/internal/infra/supax/repositories.go`

```json
{
  "id": "uuid",
  "clerk_user_id": "user_x",
  "email": "person@example.com",
  "first_name": "A",
  "last_name": "B",
  "avatar_url": "https://example.com/a.png",
  "role": "member",
  "country": "US",
  "deleted": false,
  "deleted_at": null,
  "created_at": "2026-06-19T00:00:00Z",
  "updated_at": "2026-06-19T00:00:00Z"
}
```

Nullable fields in code: `email`, `first_name`, `last_name`, `avatar_url`, `role`, `country`, `deleted`, `deleted_at`.

## InterestTagRow

Source: `apps/api/src/internal/infra/supax/repositories.go`

```json
{
  "id": "uuid",
  "name": "Music",
  "description": "Optional text",
  "icon": "music",
  "category": "hobbies",
  "is_active": true,
  "created_at": "2026-06-19T00:00:00Z",
  "updated_at": "2026-06-19T00:00:00Z"
}
```

Nullable fields in code: `description`, `icon`, `category`.

## User Details

Source: `apps/api/src/internal/infra/supax/extra.go`

Stored row shape:

```json
{
  "user_id": "uuid",
  "bio": "text",
  "gender": "value",
  "date_of_birth": "YYYY-MM-DD",
  "timezone": "Asia/Bangkok",
  "interest_tags": ["tag_id"],
  "created_at": "2026-06-19T00:00:00Z",
  "updated_at": "2026-06-19T00:00:00Z"
}
```

`GET /api/v1/users/details/me` returns `user_details_expanded` as a raw map. Exact expanded fields are not found in code.

## User Settings

Source: `apps/api/src/internal/infra/supax/extra.go`

```json
{
  "user_id": "uuid",
  "settings": {},
  "theme": "dark",
  "language": "en",
  "created_at": "2026-06-19T00:00:00Z",
  "updated_at": "2026-06-19T00:00:00Z"
}
```

Handlers return raw maps from `user_settings`; exact fields beyond this struct are not found in code.

## User Profile Aggregate

Source: `apps/api/src/internal/infra/supax/extra.go`

```json
{
  "user": {},
  "details": {},
  "settings": {}
}
```

`user` is `UserRow`. `details` and `settings` are raw maps. Exact expanded fields are not found in code.

## User Level

Source: `apps/api/src/internal/app/user/service.go`

```json
{
  "userId": "uuid",
  "totalExpSeconds": 3600,
  "level": 2,
  "expToNextLevel": 1200,
  "createdAt": "2026-06-19T00:00:00Z",
  "updatedAt": "2026-06-19T00:00:00Z"
}
```

## User Streak

Source: `apps/api/src/internal/app/user/service.go`

```json
{
  "userId": "uuid",
  "currentStreak": 3,
  "longestStreak": 8,
  "lastValidDate": "2026-06-18",
  "lastContinuationUsedFreeze": false,
  "updatedAt": "2026-06-19T00:00:00Z"
}
```

## Progress Insights

Source: `apps/api/src/internal/domain/user/progress/progress.go`

```json
{
  "currentLevel": 2,
  "expBonuses": [
    {
      "type": "streak",
      "multiplier": 1.2,
      "min": 3,
      "max": 7,
      "relation": null
    }
  ],
  "expProgress": {
    "totalExpSeconds": 3600,
    "expToNextLevel": 1200,
    "progressPercentage": 75
  },
  "expEarnedToday": 300,
  "remainingSecondsToNextLevel": 1200,
  "streakStatus": "active",
  "todayCallDuration": {
    "totalSeconds": 300,
    "isValid": true
  },
  "todayCallDurationSeconds": 300,
  "streakRequiredSeconds": 300,
  "streakRemainingSeconds": 0,
  "isTodayStreakComplete": true,
  "streakIfTodayCompleted": 4,
  "streak": {
    "currentStreak": 3,
    "longestStreak": 8,
    "remainingSecondsToKeepStreak": 0,
    "lastValidDate": "2026-06-18"
  },
  "todayDate": "2026-06-19",
  "recentStreakDays": [
    {
      "date": "2026-06-19",
      "isValid": true
    }
  ]
}
```

`streakStatus` enum values found in code: `active`, `incomplete`, `frozen`.

`expBonuses[].type` enum values found in code: `streak`, `level`, `favorite`.

## Call History

Sources:

- `apps/api/src/internal/infra/supax/calls_repo.go`
- `apps/api/src/internal/app/videochat/calls.go`

Stored row:

```json
{
  "id": "uuid",
  "caller_id": "uuid",
  "callee_id": "uuid",
  "caller_country": "US",
  "callee_country": "VN",
  "started_at": "2026-06-19T00:00:00Z",
  "ended_at": "2026-06-19T00:05:00Z",
  "duration_seconds": 300,
  "created_at": "2026-06-19T00:00:00Z",
  "updated_at": "2026-06-19T00:00:00Z"
}
```

List rows are enriched:

```json
{
  "id": "uuid",
  "caller_id": "uuid",
  "callee_id": "uuid",
  "other_user": {
    "id": "uuid",
    "name": "Anonymous",
    "avatar_url": null,
    "country": "US"
  },
  "is_caller": true
}
```

## NotificationRow

Source: `apps/api/src/internal/infra/supax/repositories.go`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "type",
  "title": "Title",
  "body": "Body",
  "data": {},
  "is_read": false,
  "read_at": null,
  "created_at": "2026-06-19T00:00:00Z"
}
```

## ReportRow

Source: `apps/api/src/internal/infra/supax/extra.go`

```json
{
  "id": "uuid",
  "reporter_user_id": "uuid",
  "reported_user_id": "uuid",
  "reason": "reason",
  "description": "optional",
  "status": "pending",
  "metadata": {},
  "admin_notes": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at": "2026-06-19T00:00:00Z",
  "updated_at": "2026-06-19T00:00:00Z",
  "reporter_first_name": null,
  "reporter_last_name": null,
  "reporter_avatar_url": null,
  "reporter_email": null,
  "reported_first_name": null,
  "reported_last_name": null,
  "reported_avatar_url": null,
  "reported_email": null,
  "reviewed_by_first_name": null,
  "reviewed_by_last_name": null,
  "reviewed_by_avatar_url": null
}
```

Report status enum values are not found in code.

## Favorite Rows

Source: `apps/api/src/internal/infra/supax/favorites/favorites.go`

Created favorite:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "favorite_user_id": "uuid",
  "created_at": "2026-06-19T00:00:00Z"
}
```

Favorite list row:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "favorite_user_id": "uuid",
  "created_at": "2026-06-19T00:00:00Z",
  "clerk_user_id": "user_x",
  "email": "person@example.com",
  "first_name": "A",
  "last_name": "B",
  "avatar_url": "https://example.com/a.png",
  "country": "US",
  "match_count": 1,
  "total_duration": 300,
  "average_duration": 300
}
```

## PushSubscriptionRow

Source: `apps/api/src/internal/infra/supax/repositories.go`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "endpoint": "https://push.example/sub",
  "p256dh": "key",
  "auth": "secret",
  "created_at": "2026-06-19T00:00:00Z"
}
```

## S3 Multipart Part

Source: `apps/api/src/internal/transport/http/s3_routes.go`

```json
{
  "partNumber": 1,
  "etag": "etag"
}
```

`etag` may also be accepted as `ETag` by `POST /api/v1/me/s3/multipart/complete`.

## Realtime DTOs

Sources:

- `apps/api/src/internal/transport/http/realtime_routes.go`
- `apps/api/src/internal/infra/cloudflarerealtime/client.go`
- `apps/api/src/internal/app/videochat/realtime/service.go`

SDP description:

```json
{
  "sdp": "v=0...",
  "type": "offer"
}
```

Publish track input:

```json
{
  "mid": "0",
  "trackName": "camera",
  "kind": "video"
}
```

`kind` accepted values in handler: `audio`, `video`.

Track response:

```json
{
  "trackName": "camera",
  "mid": "0",
  "kind": "video",
  "errorCode": "",
  "errorDescription": ""
}
```

Peer snapshot:

```json
{
  "peerSessionId": "session_id",
  "tracks": [
    {
      "trackName": "camera",
      "kind": "video",
      "source": "camera"
    }
  ]
}
```

## AI Config

Sources:

- `apps/api/src/internal/infra/aiconfig/config.go`
- `apps/api/src/internal/infra/aiconfig/redact.go`

Writable settings:

```json
{
  "base_url": "https://api.example.com/v1",
  "api_key": "redacted or ignored on upsert",
  "models": {
    "chat": {
      "broadcast": "model",
      "report_summary": "model"
    },
    "embedding": "model",
    "image": "model",
    "tts": "model",
    "stt": "model",
    "web_search": "model",
    "web_fetch": "model"
  },
  "timeouts": {
    "request_ms": 60000,
    "embedding_ms": 60000
  },
  "embedding": {
    "user_api_batch_size": 8,
    "dimension": 1536
  }
}
```

`api_key` is removed by redaction/upsert merge helpers and is not exposed in public admin responses.

## Broadcast AI Output

Source: `apps/api/src/internal/app/broadcastai/context.go`

```json
{
  "primary": {
    "title": "Title",
    "body": "Body",
    "cta": "Open"
  },
  "tone_variants": [
    {
      "tone": "friendly",
      "title": "Title",
      "body": "Body",
      "cta": "Open"
    },
    {
      "tone": "professional",
      "title": "Title",
      "body": "Body",
      "cta": "Open"
    },
    {
      "tone": "direct",
      "title": "Title",
      "body": "Body",
      "cta": "Open"
    }
  ]
}
```

Tone enum values found in code: `friendly`, `professional`, `direct`.

## Admin User List Row

Source: `apps/api/src/internal/transport/http/admin_routes.go`

```json
{
  "id": "uuid",
  "clerk_user_id": "user_x",
  "email": "person@example.com",
  "first_name": "A",
  "last_name": "B",
  "avatar_url": "https://example.com/a.png",
  "role": "member",
  "deleted": false,
  "presence": "offline",
  "created_at": "2026-06-19T00:00:00Z",
  "updated_at": "2026-06-19T00:00:00Z",
  "details": {
    "bio": null,
    "gender": null,
    "date_of_birth": null
  },
  "interest_tag_names": ["Music"],
  "embedding": {
    "model": "model",
    "source_hash": "hash",
    "updated_at": "2026-06-19T00:00:00Z"
  },
  "level": 1
}
```

`presence` defaults to `offline`; other presence values are not enumerated in code.

## BroadcastHistoryRow

Source: `apps/api/src/internal/infra/supax/extra.go`

```json
{
  "id": "uuid",
  "created_by_user_id": "uuid",
  "title": "Title",
  "message": "Message",
  "created_at": "2026-06-19T00:00:00Z",
  "creator_first_name": "A",
  "creator_last_name": "B",
  "creator_email": "person@example.com"
}
```

## Clerk Admin Pass-through Types

Sources:

- `apps/api/src/internal/transport/http/admin_clerk_users.go`
- `apps/api/src/internal/infra/clerkapi/users.go`

Clerk user update bodies are arbitrary JSON maps passed to Clerk. Exact fields are not found in code.

List response:

```json
{
  "data": [],
  "count": 0
}
```

Set compromised password request:

```json
{
  "revoke_all_sessions": true
}
```
