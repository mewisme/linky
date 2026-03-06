# 14 -- API Contracts

## Purpose

Complete catalog of all HTTP API endpoints, including methods, paths, authentication requirements, request/response shapes, and error codes.

## Scope

All Express.js route handlers in the backend API.

## Dependencies

- [03-authentication.md](03-authentication.md) for auth requirements
- [02-architecture.md](02-architecture.md) for route structure

## Cross References

- [15-server-actions.md](15-server-actions.md) for frontend consumption patterns

---

## 1. Public Endpoints (No Authentication)

### Health

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | `{ environment, timestamp, status }` |
| GET | `/healthz` | Health check |
| GET | `/health` | `{ status: "ok", timestamp }` |
| GET | `/api` | `{ message: "API is running" }` |

### Reference Data

| Method | Path | Response | Description |
|--------|------|----------|-------------|
| GET | `/api/v1/interest-tags` | `InterestTag[]` | All active interest tags |
| GET | `/api/v1/changelogs` | `Changelog[]` | Public changelogs |
| GET | `/api/v1/matchmaking/queue-status` | `{ queueSize, estimatedWaitSeconds }` | Current queue status |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook` | Svix signature | Clerk webhook events |

---

## 2. User Endpoints (Clerk Auth Required)

### User Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get current user |
| GET | `/api/v1/users/me/country` | Get user's country |
| PUT | `/api/v1/users/timezone` | Update timezone |
| GET | `/api/v1/users/profile/me` | Get full profile aggregate |
| GET | `/api/v1/users/details/me` | Get user details |
| PATCH | `/api/v1/users/details/me` | Update user details |
| GET | `/api/v1/users/settings/me` | Get user settings |
| PATCH | `/api/v1/users/settings/me` | Update user settings |

### Interest Tags (User)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/details/me/interest-tags` | Get user's selected tags |
| PUT | `/api/v1/users/details/me/interest-tags` | Update user's tags |
| GET | `/api/v1/users/details/me/interest-tags/all` | Get all tags with user's selections |

### Level and Progress

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/level/me` | Get level data |
| GET | `/api/v1/users/progress/me` | Get progress overview |

### Streak

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/streak/me` | Get streak data |
| GET | `/api/v1/users/streak/me/history` | Get streak day history (paginated) |
| GET | `/api/v1/users/streak/calendar` | Get monthly streak calendar |

### Blocks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/blocks` | List blocked users |
| GET | `/api/v1/users/blocks/me` | List users blocking me |
| POST | `/api/v1/users/blocks/:userId` | Block a user |
| DELETE | `/api/v1/users/blocks/:userId` | Unblock a user |

### Prestige

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/users/prestige` | Execute prestige |

---

## 3. Economy Endpoints (Clerk Auth Required)

### Conversion

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/v1/economy/convert` | `{ expAmount: number }` | Convert EXP to coins |

### Daily

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/api/v1/economy/daily/progress` | `?date=YYYY-MM-DD` | Get daily EXP progress |

### Weekly

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/economy/weekly/progress` | Get weekly check-in progress |
| POST | `/api/v1/economy/weekly/checkin` | Claim daily check-in |

### Monthly

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/economy/monthly/progress` | Get monthly progress |
| POST | `/api/v1/economy/monthly/checkin` | Claim day |
| POST | `/api/v1/economy/monthly/buyback` | Buyback missed day |

### Shop

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/economy/shop` | List shop items with ownership |
| POST | `/api/v1/economy/shop/purchase` | Purchase item |

### Boost

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/v1/economy/boost/purchase` | `{ boostType }` | Purchase boost |

---

## 4. Resource Endpoints (Clerk Auth Required)

### Call History

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/call-history` | List call history (paginated) |
| GET | `/api/v1/call-history/:id` | Get single call record |

### Favorites

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/favorites` | List favorites |
| POST | `/api/v1/favorites` | Add favorite |
| DELETE | `/api/v1/favorites/:userId` | Remove favorite |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reports/me` | Get my submitted reports |
| POST | `/api/v1/reports` | Submit report |

### Video Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/video-chat/end-call-unload` | End call via HTTP (beforeunload fallback) |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/notifications/me` | Get notifications (paginated) |
| GET | `/api/v1/notifications/me/unread-count` | Get unread count |
| POST | `/api/v1/notifications/read-all` | Mark all read |
| POST | `/api/v1/notifications/:id/read` | Mark one read |

### Push

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/push/subscribe` | Register push subscription |
| POST | `/api/v1/push/unsubscribe` | Remove push subscription |
| GET | `/api/v1/push/vapid-public-key` | Get VAPID public key |

### Media

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ice-servers` | Get TURN/STUN server credentials |
| POST | `/api/v1/s3/presigned-upload` | Get S3 presigned upload URL |

---

## 5. Admin Endpoints (Clerk Auth + Admin Role Required)

All under `/api/v1/admin/`. See [09-admin-system.md](09-admin-system.md) for full admin endpoint documentation.

---

## 6. Error Response Format

All error responses follow the standard format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable description"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid parameters, validation failure |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Non-admin accessing admin route |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### Domain-Specific Error Codes

| Domain | Error Code | HTTP Status |
|--------|-----------|-------------|
| Economy | `INSUFFICIENT_EXP` | 400 |
| Economy | `INVALID_AMOUNT` | 400 |
| Shop | `ITEM_NOT_FOUND` | 404 |
| Shop | `ALREADY_OWNED` | 400 |
| Shop | `INSUFFICIENT_COINS` | 400 |
| Boost | `INVALID_BOOST_TYPE` | 400 |
| Boost | `INSUFFICIENT_COINS` | 400 |
| Weekly | `ALREADY_CLAIMED` | 400 |
| Monthly | `ALREADY_CLAIMED` | 400 |
| Monthly | `INVALID_DAY` | 400 |
| Monthly | `FUTURE_DAY` | 400 |
| Monthly | `BUYBACK_FUTURE_OR_TODAY` | 400 |
| Monthly | `INSUFFICIENT_EXP` | 400 |
| Prestige | `PRESTIGE_THRESHOLD_NOT_MET` | 400 |
| Season | `ACTIVE_SEASON_EXISTS` | 400 |

---

## Related Components

- Server actions: [15-server-actions.md](15-server-actions.md)
- Authentication: [03-authentication.md](03-authentication.md)
- Database schema: [12-database-schema.md](12-database-schema.md)

## Risk Considerations

- No API versioning beyond `/v1` path prefix
- No OpenAPI/Swagger specification generated from code
- Error response format is consistent but error codes are domain-specific strings
- Pagination parameters vary between endpoints (limit/offset vs cursor)
