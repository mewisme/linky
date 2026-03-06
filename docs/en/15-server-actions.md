# 15 -- Server Actions

## Purpose

This document catalogs all Next.js server actions used in the Linky frontend, including their caching strategies, revalidation triggers, and Sentry instrumentation patterns.

## Scope

All files in `apps/web/src/actions/` and the `withSentryAction`/`withSentryQuery` patterns used throughout the application.

## Dependencies

- [14-api-contracts.md](14-api-contracts.md) for backend API contracts

## Cross References

- [10-caching-architecture.md](10-caching-architecture.md) for cache tag system

---

## 1. Server Action Patterns

### 1.1 Mutating Action Pattern

```typescript
export async function mutatingAction(params) {
  return withSentryAction("actionName", async () => {
    const result = await serverFetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      token: true
    });
    revalidateTag(cacheTags.relevantTag);
    return result;
  });
}
```

### 1.2 Query Action Pattern (Cached)

```typescript
export async function queryAction(params) {
  return withSentryQuery(
    "queryName",
    async (token) => serverFetch(url, { preloadedToken: token }),
    { keyParts: [cacheTags.tag, queryKey], tags: [cacheTags.tag] }
  );
}
```

---

## 2. Server Action Catalog

### 2.1 Matchmaking Actions

Location: `apps/web/src/actions/matchmaking.ts`

| Action | Type | Backend Endpoint | Cache Tag | Revalidates |
|--------|------|-----------------|-----------|-------------|
| `getQueueStatus` | Query | `GET /api/v1/matchmaking/queue-status` | `matchmaking` | No |

### 2.2 Call History Actions

Location: `apps/web/src/actions/resources/call-history.ts`

| Action | Type | Backend Endpoint | Cache Tag | Revalidates |
|--------|------|-----------------|-----------|-------------|
| `getCallHistory` | Query | `GET /api/v1/call-history` | `call-history` | No |
| `getCallHistoryById` | Query | `GET /api/v1/call-history/:id` | `call-history` | No |

### 2.3 Favorites Actions

Location: `apps/web/src/actions/resources/favorites.ts`

| Action | Type | Backend Endpoint | Cache Tag | Revalidates |
|--------|------|-----------------|-----------|-------------|
| `getFavorites` | Query | `GET /api/v1/favorites` | `favorites` | No |
| `addFavorite` | Mutation | `POST /api/v1/favorites` | -- | `favorites` |
| `removeFavorite` | Mutation | `DELETE /api/v1/favorites/:userId` | -- | `favorites` |

### 2.4 Reports Actions

Location: `apps/web/src/actions/resources/reports.ts`

| Action | Type | Backend Endpoint | Cache Tag | Revalidates |
|--------|------|-----------------|-----------|-------------|
| `getMyReports` | Query | `GET /api/v1/reports/me` | `reports-me` | No |
| `createReport` | Mutation | `POST /api/v1/reports` | -- | `reports-me` |

### 2.5 Changelogs Actions

Location: `apps/web/src/actions/resources/changelogs.ts`

| Action | Type | Backend Endpoint | Cache Tag | Revalidates |
|--------|------|-----------------|-----------|-------------|
| `getChangelogs` | Query | `GET /api/v1/changelogs` | `changelog` | No |

### 2.6 Interest Tags Actions

Location: `apps/web/src/actions/resources/interest-tags.ts`

| Action | Type | Backend Endpoint | Cache Tag | Revalidates |
|--------|------|-----------------|-----------|-------------|
| `getInterestTags` | Query | `GET /api/v1/interest-tags` | `interest-tags-public` | No |

---

## 3. Sentry Integration

### 3.1 withSentryAction

Wraps server actions with Sentry server action instrumentation:
- Captures headers for distributed tracing
- Records response data
- Creates Sentry transactions for performance monitoring

### 3.2 withSentryQuery

Extends `withSentryAction` with Next.js data cache integration:
1. Extracts Clerk auth token before caching
2. Includes user ID in cache key parts for per-user caching
3. Applies `unstable_cache` with configured tags and revalidation
4. Falls back gracefully if auth is unavailable (public routes)

---

## 4. Cache Key Strategy

Cache keys are constructed from:
1. **User ID** -- Automatically prepended by `withSentryQuery` when authenticated
2. **Cache tag** -- Semantic identifier (e.g., `"call-history"`)
3. **Query parameters** -- Serialized query string for unique cache entries per filter combination

Example: For `getCallHistory({ limit: 10, offset: 0 })`:
- Key parts: `[userId, "call-history", "limit=10&offset=0"]`
- Tags: `["call-history"]`

---

## 5. Revalidation Flow

```
User performs mutation (e.g., addFavorite)
  │
  ├── serverFetch(POST /api/v1/favorites, { token: true })
  │    → Backend processes request
  │    → Backend invalidates Redis cache
  │
  ├── revalidateTag("favorites")
  │    → Next.js purges all cached entries tagged "favorites"
  │
  └── Next page load
       → withSentryQuery re-fetches from backend
       → Backend may serve from fresh Redis cache or database
       → New data displayed
```

---

## Related Components

- API contracts: [14-api-contracts.md](14-api-contracts.md)
- Cache tags: [10-caching-architecture.md](10-caching-architecture.md)
- Observability: [16-observability.md](16-observability.md)

## Risk Considerations

- `unstable_cache` API may change in future Next.js versions
- Cache key construction depends on user ID availability; failures in auth may cause shared cache entries
- Revalidation is tag-based; a single tag invalidation may bust many cached entries
- No TTL-based revalidation is configured (relies entirely on tag-based invalidation)
