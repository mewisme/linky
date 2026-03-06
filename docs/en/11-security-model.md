# 11 -- Security Model

## Purpose

This document describes the security architecture of the Linky platform, covering authentication enforcement, authorization model, rate limiting, CORS policy, input validation, anti-abuse mechanisms, and data protection strategies.

## Scope

Covers all security-relevant components across backend and frontend.

## Dependencies

- [03-authentication.md](03-authentication.md) for auth implementation
- [10-caching-architecture.md](10-caching-architecture.md) for cache security

## Cross References

- [09-admin-system.md](09-admin-system.md) for admin authorization
- [14-api-contracts.md](14-api-contracts.md) for per-endpoint security

---

## 1. Authentication Security

### 1.1 JWT Verification

All authenticated endpoints verify Clerk-issued JWTs using the `CLERK_SECRET_KEY`. The JWT contains:
- `sub` -- Clerk user ID (primary identity)
- Standard JWT claims (exp, iat, iss)

Verification occurs at the middleware level before any business logic executes.

### 1.2 Token Transport

- HTTP: `Authorization: Bearer {token}` header
- Socket.IO: `socket.handshake.auth.token` (primary) or `socket.handshake.query.token` (fallback)

### 1.3 Webhook Signature Verification

Clerk webhook events are verified using `CLERK_WEBHOOK_SECRET` via the Svix library before processing.

---

## 2. Authorization Model

### 2.1 Endpoint Authorization

| Route Category | Auth Required | Admin Required | Notes |
|----------------|--------------|----------------|-------|
| `/healthz`, `/health` | No | No | Health checks |
| `/webhook` | No | No | Webhook signature verification instead |
| `/api/v1/interest-tags` | No | No | Public reference data |
| `/api/v1/changelogs` | No | No | Public reference data |
| `/api/v1/matchmaking/queue-status` | No | No | Public queue info |
| `/api/v1/users/*` | Yes | No | User-scoped operations |
| `/api/v1/economy/*` | Yes | No | Economy operations |
| `/api/v1/notifications/*` | Yes | No | Notification operations |
| `/api/v1/admin/*` | Yes | Yes | Admin operations |

### 2.2 User Isolation

Users can only access their own data. The `req.auth.sub` (Clerk user ID) is used to scope all queries:
- User profile/details/settings: filtered by own user ID
- Call history: filtered by own user ID as caller or callee
- Notifications: filtered by own user ID
- Favorites: filtered by own user ID as the favoriter
- Reports: users can only view their own submitted reports

### 2.3 Admin Role Verification

Admin access is verified via the admin cache system:
1. Redis cache check (`admin:role:{clerkUserId}`)
2. Database fallback (`users.role` column)
3. Result cached for 5 minutes

---

## 3. Rate Limiting

Location: `apps/api/src/middleware/rate-limit.ts`

### 3.1 Implementation

Redis-based sliding window counter:
- Identifier: `req.auth.sub` (authenticated user ID) or `req.ip` (unauthenticated)
- Key: `rate-limit:{identifier}`
- Window: `RATE_LIMIT_WINDOW_MS` (default: 30,000ms)
- Max requests: `RATE_LIMIT_MAX_REQUESTS` (default: 100)

### 3.2 Response Headers

All responses include:
- `X-RateLimit-Limit` -- Maximum requests per window
- `X-RateLimit-Remaining` -- Remaining requests
- `X-RateLimit-Reset` -- Window reset time (ISO 8601)

### 3.3 Rate Limit Exceeded Response

HTTP 429 with body:
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

### 3.4 Redis Unavailability

If Redis is unavailable, rate limiting is bypassed entirely (fail-open).

### 3.5 Socket.IO Rate Limiting

Video chat socket events have per-event rate limiting via `apps/api/src/domains/video-chat/socket/helpers/rate-limit.helper.ts`.

---

## 4. CORS Policy

Configured via `CORS_ORIGIN` environment variable.

Applied to:
- Express HTTP server
- Socket.IO server

Socket.IO CORS:
```javascript
{
  origin: config.corsOrigin,
  methods: ["GET", "POST"],
  credentials: true
}
```

---

## 5. Input Validation

### 5.1 Request Body Size

Configured via `JSON_BODY_SIZE_LIMIT` (default: `"500kb"`).

### 5.2 Socket Buffer Size

Configured via `SOCKET_MAX_HTTP_BUFFER_SIZE` (default: 8MB).

### 5.3 Parameter Validation

Route handlers validate:
- Required fields presence
- Type correctness (numbers, strings, etc.)
- Range constraints (e.g., EXP conversion minimum 100, multiple of 100)
- Format constraints (e.g., valid date strings, valid UUIDs)

---

## 6. Anti-Abuse Mechanisms

### 6.1 User Blocking

Users can block other users:
- Blocked users are excluded from matchmaking
- Blocking is bidirectional for matchmaking (either side blocks = excluded)
- Block list is cached in Redis (30-minute TTL)

### 6.2 Report System

Users can report other users:
- Reports go into a `pending` → `reviewed` → `resolved`/`dismissed` lifecycle
- Reports include context enrichment (reporter and reported user details)
- Admin can review and take action

### 6.3 Skip Cooldown

Matchmaking tracks skips between user pairs to prevent harassment via repeated skipping.

### 6.4 Queue Timeout

Users are automatically removed from the matchmaking queue after 5 minutes to prevent indefinite occupation.

### 6.5 Stale Socket Cleanup

Every 30 seconds, the matchmaking system removes queue entries for disconnected sockets (with a 3-second grace period for new entries).

### 6.6 Automation Test Email Filtering

The webhook handler detects automation test emails (via `canAutoRemoveUserEmail`) and automatically deletes corresponding Clerk accounts to prevent test data accumulation.

---

## 7. Data Protection

### 7.1 Soft Delete

User deletion is always soft:
- `deleted = true`, `deleted_at = now()`
- Preserves referential integrity
- Can be reversed (re-registration with same email reactivates)

### 7.2 Service Role Architecture

The backend uses the Supabase service role key, which bypasses Row Level Security. This design decision means:
- All authorization is enforced at the application layer
- Database-level RLS is not the primary access control mechanism
- The service role key must be protected; compromise grants full database access

### 7.3 Sensitive Configuration

All secrets are loaded from environment variables:
- Clerk keys
- Supabase service role key
- S3 credentials
- MQTT credentials
- VAPID keys
- Cloudflare TURN credentials

No secrets are hardcoded in the codebase.

---

## 8. Graceful Shutdown Security

Location: `apps/api/src/middleware/graceful-shutdown.ts`

The graceful shutdown handler:
1. Stops accepting new connections
2. Closes Socket.IO connections
3. Closes Redis connections
4. Closes MQTT connections
5. Flushes Sentry events (2s timeout)
6. Handles uncaught exceptions and unhandled rejections

Shutdown timeout: `SHUTDOWN_TIMEOUT` (default: 30,000ms). If exceeded, the process force-exits.

---

## 9. Security Assumptions

1. **Clerk is trusted**: JWT tokens issued by Clerk are considered authoritative for user identity
2. **Supabase is trusted**: The database is accessed via service role, trusting the application layer for authorization
3. **Redis is internal**: Redis is not exposed publicly; access is restricted to the internal network
4. **MQTT credentials are shared**: All clients use the same MQTT credentials; user-level MQTT authorization is not implemented
5. **WebRTC media is peer-to-peer**: Video/audio streams flow directly between clients via TURN; the server does not inspect media
6. **S3 presigned URLs are time-limited**: Upload URLs expire; download security depends on bucket policy
7. **Push notification payloads are not encrypted**: Notification content is visible to the push service

---

## Related Components

- Auth implementation: [03-authentication.md](03-authentication.md)
- Admin permissions: [09-admin-system.md](09-admin-system.md)
- Rate limit configuration: [01-overview.md](01-overview.md)

## Risk Considerations

- Service role key bypass of RLS centralizes authorization responsibility in application code
- Rate limiting fails open when Redis is unavailable
- MQTT shared credentials means any client with credentials can publish to any presence topic
- No content scanning or filtering for chat messages or uploaded media
- No IP-based blocking mechanism (only user-level blocking)
- Admin role changes take up to 5 minutes to propagate via cache
- Socket.IO auth token is not refreshed during long-lived connections (relies on client-initiated reconnection)
