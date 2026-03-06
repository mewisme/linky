# 10 -- Caching Architecture

## Purpose

This document describes the complete caching architecture of the Linky platform, including the Redis cache-aside pattern, key namespacing, TTL policies, invalidation rules, timeout handling, and the relationship between Redis caching and Next.js data caching.

## Scope

Covers backend Redis caching (`apps/api/src/infra/redis/`) and frontend Next.js cache tags (`apps/web/src/lib/cache/tags.ts`).

## Dependencies

- [02-architecture.md](02-architecture.md) for infrastructure layer

## Cross References

- [18-performance-strategy.md](18-performance-strategy.md) for caching strategy
- [12-database-schema.md](12-database-schema.md) for data sources

---

## 1. Cache-Aside Pattern

Redis is used exclusively as a read-optimization layer. The database (Supabase/Postgres) is always the source of truth.

### 1.1 Core Function: getOrSet

Location: `apps/api/src/infra/redis/cache/index.ts`

```
getOrSet<T>(key, ttlSeconds, fetchFromDb):
  1. Try Redis GET (with timeout)
     - If hit → parse JSON → return
     - If parse fails → log warning, continue
     - If Redis error → log warning, continue
  2. Call fetchFromDb() → data
  3. Try Redis SET with EX ttl (with timeout)
     - If Redis error → log warning (swallow)
  4. Return data
```

Key design decisions:
- All Redis operations are wrapped with `withRedisTimeout()`
- Cache failures are logged and swallowed, never rethrown
- The system degrades to direct database access when Redis is unavailable

### 1.2 Invalidation Functions

```
invalidate(key):
  - Redis DEL on resolved key
  - Failures logged and swallowed

invalidateByPrefix(prefix):
  - SCAN for matching keys (COUNT=200 per iteration)
  - Batch DEL (up to 500 keys per batch)
  - Failures logged and swallowed
```

---

## 2. Key Namespacing

### 2.1 Cache Namespace Version

Configured via `CACHE_NAMESPACE_VERSION` environment variable (default: `"v1"`).

Location: `apps/api/src/infra/redis/cache-namespace.ts`

Versioned keys are prefixed with `linky:{version}:` to enable cache busting across deployments.

### 2.2 Key Resolution

```
shouldVersionKey(key):
  - Returns true for keys that should be namespaced
  - Returns false for keys managed outside the versioning system

getCacheKey(key):
  - Returns "linky:{version}:{key}"

resolveCacheKey(key):
  - If shouldVersionKey → getCacheKey
  - Otherwise → key as-is
```

---

## 3. Redis Cache Keys

### 3.1 Primary Cache Keys

Location: `apps/api/src/infra/redis/cache/keys.ts`

| Key Pattern | Function | Description |
|-------------|----------|-------------|
| `user:profile:{userId}` | `userProfile(userId)` | Full user profile data |
| `user:progress:{userId}:{timezone}` | `userProgress(userId, tz)` | User progress metrics |
| `user:streak:calendar:{userId}:{year}:{month}:{tz}` | `userStreakCalendar(...)` | Monthly streak calendar |
| `user:exp_today:{userId}:{dateStr}` | `userExpToday(userId, date)` | Today's EXP counter |
| `user:blocks:{userId}` | `userBlocks(userId)` | User's block list |
| `admin:{resource}:{filtersHash}` | `admin(resource, hash)` | Admin list queries |
| `admin:{resource}:` | `adminPrefix(resource)` | Prefix for admin cache invalidation |

### 3.2 Extended Cache Keys

Location: `apps/api/src/infra/redis/cache-config.ts`

| Key Pattern | Function | Description |
|-------------|----------|-------------|
| `ref:interest-tags` | `interestTags()` | Public interest tags list |
| `ref:interest-tag:{id}` | `interestTag(id)` | Single interest tag |
| `ref:changelogs` | `changelogs()` | Public changelogs list |
| `ref:changelog:{version}` | `changelog(version)` | Single changelog entry |
| `user:details:{userId}` | `userDetails(userId)` | User details record |
| `user:settings:{userId}` | `userSettings(userId)` | User settings |
| `user:favorites:{userId}` | `userFavorites(userId)` | User's favorites list |
| `user:reports:{userId}` | `userReports(userId)` | User's reports |
| `user:call-history:{userId}` | `callHistory(userId)` | User's call history |
| `call-history:item:{callId}` | `callHistoryItem(callId)` | Single call record |

---

## 4. TTL Policies

### 4.1 Primary TTLs

Location: `apps/api/src/infra/redis/cache/policy.ts`

| Constant | Value | Duration | Usage |
|----------|-------|----------|-------|
| `USER_PROFILE` | 600 | 10 minutes | User profile data |
| `USER_PROGRESS` | 45 | 45 seconds | Progress metrics (changes frequently) |
| `USER_STREAK_CALENDAR_CURRENT_MONTH` | 90 | 90 seconds | Current month streak data |
| `USER_STREAK_CALENDAR_PAST_MONTH` | 86400 | 24 hours | Historical month streak data |
| `USER_BLOCKS` | 1800 | 30 minutes | User block lists |
| `ADMIN_LISTS` | 60 | 60 seconds | Admin list queries |

### 4.2 Extended TTLs

Location: `apps/api/src/infra/redis/cache-config.ts`

| Constant | Value | Duration | Usage |
|----------|-------|----------|-------|
| `REFERENCE_DATA` | 86400 | 24 hours | Static reference data |
| `INTEREST_TAGS` | 86400 | 24 hours | Interest tags (rarely change) |
| `CHANGELOGS` | 86400 | 24 hours | Changelogs (rarely change) |
| `USER_DATA` | 900 | 15 minutes | General user data |
| `USER_DETAILS` | 900 | 15 minutes | User details |
| `USER_SETTINGS` | 900 | 15 minutes | User settings |
| `USER_FAVORITES` | 900 | 15 minutes | Favorites |
| `USER_REPORTS` | 900 | 15 minutes | Reports |
| `CALL_HISTORY` | 900 | 15 minutes | Call history |

### 4.3 Special TTLs

| Key | TTL | Source |
|-----|-----|--------|
| Admin role cache | 300s (5 min) | `infra/admin-cache/` |
| Rate limit counters | Configured per window | `middleware/rate-limit.ts` |

---

## 5. Invalidation Rules

### 5.1 User Profile Invalidation

Triggered by:
- Clerk webhook `user.updated`
- Clerk webhook `user.created` (reactivation)
- User profile/details/settings update

Key: `REDIS_CACHE_KEYS.userProfile(userId)`

### 5.2 User Progress Invalidation

Triggered by:
- Call end (EXP increment)
- Streak day completion

Key: `REDIS_CACHE_KEYS.userProgress(userId, timezone)` or prefix `user:progress:{userId}:`

### 5.3 Streak Calendar Invalidation

Triggered by:
- Streak day update (for current month only)

Key: `REDIS_CACHE_KEYS.userStreakCalendar(userId, year, month, timezone)`

### 5.4 Admin List Invalidation

Triggered by:
- Any admin CRUD write operation

Key: `REDIS_CACHE_KEYS.adminPrefix(resource)` (prefix invalidation)

### 5.5 User Deletion Invalidation

Triggered by:
- Clerk webhook `user.deleted`

Key: `REDIS_CACHE_KEYS.adminPrefix("users")`

---

## 6. Timeout Handling

Location: `apps/api/src/infra/redis/timeout-wrapper.ts`

```
withRedisTimeout<T>(operation, operationName):
  - Races operation() against setTimeout(REDIS_TIMEOUT)
  - Default timeout: 5000ms (configurable via REDIS_TIMEOUT env)
  - On timeout: throws Error with operation name
  - On any error: logs via Pino, re-throws
```

All cache operations (get, set, del, scan) are wrapped with this timeout to prevent Redis hangs from blocking request processing.

---

## 7. Redis Availability Handling

### 7.1 Cache Operations

All getOrSet, invalidate, and invalidateByPrefix operations swallow Redis errors:
- On Redis GET failure: proceeds to database fetch
- On Redis SET failure: returns database result (not cached)
- On Redis DEL failure: stale data may persist until TTL expiry

### 7.2 Rate Limiting

The rate limit middleware checks `redisClient.isOpen` before attempting rate limit checks. If Redis is unavailable, rate limiting is bypassed.

---

## 8. Frontend Cache (Next.js Data Cache)

### 8.1 Cache Tags

Location: `apps/web/src/lib/cache/tags.ts`

The frontend uses Next.js `unstable_cache` with tag-based revalidation:

| Tag | Usage |
|-----|-------|
| `user-profile` | User profile page data |
| `user-progress` | Progress page data |
| `user-settings` | Settings page data |
| `user-streak` | Streak data |
| `user-blocks` | Block list |
| `user-interest-tags` | User's interest tags |
| `favorites` | Favorites list |
| `call-history` | Call history |
| `reports-me` | User's reports |
| `notifications` | Notification list |
| `interest-tags-public` | Public interest tags |
| `changelog` | Changelog data |
| `matchmaking` | Queue status |
| `admin-*` | Various admin data caches |

### 8.2 Revalidation

Server actions call `revalidateTag(tag)` after mutating operations to bust the Next.js data cache. This triggers re-fetching from the backend API on the next page load.

---

## 9. EXP Today Counter

Location: `apps/api/src/infra/redis/cache/exp-today.ts`

A specialized Redis counter for tracking today's EXP:

- Key: `user:exp_today:{userId}:{dateStr}`
- Operation: `INCRBY` (atomic increment)
- Auto-expires at end of day

This provides a fast, non-database read for the user's current daily EXP total.

---

## Related Components

- Performance strategy: [18-performance-strategy.md](18-performance-strategy.md)
- Redis deployment: [17-deployment.md](17-deployment.md)
- Rate limiting: [11-security-model.md](11-security-model.md)

## Risk Considerations

- Cache-aside with swallowed errors means silent degradation; monitoring required
- Prefix invalidation (SCAN + DEL) is O(n) and could be slow with many keys
- No cache warming strategy (except admin role cache initialization)
- Stale reads possible between database write and cache invalidation
- EXP today counter depends on Redis; loss means inaccurate daily EXP display until next call
- Frontend Next.js cache operates independently of backend Redis cache, creating a two-layer cache system with independent invalidation
