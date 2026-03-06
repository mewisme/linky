# 18 -- Performance Strategy

## Purpose

This document describes the performance optimization strategies employed across the Linky platform, including caching layers, query optimization, real-time system tuning, and frontend bundle optimization.

## Scope

Covers backend caching, database query patterns, Socket.IO tuning, and frontend rendering strategy.

## Dependencies

- [10-caching-architecture.md](10-caching-architecture.md) for cache details
- [17-deployment.md](17-deployment.md) for infrastructure context

## Cross References

- [19-scalability-strategy.md](19-scalability-strategy.md) for scaling considerations

---

## 1. Two-Layer Caching Strategy

### 1.1 Layer 1: Redis (Backend)

- Cache-aside pattern with configurable TTLs
- Timeout wrapper (5s default) prevents cache hangs from blocking requests
- Graceful degradation on Redis failure (fall through to database)
- Targeted invalidation on writes
- Namespace versioning for cache busting across deployments

### 1.2 Layer 2: Next.js Data Cache (Frontend)

- `unstable_cache` with tag-based revalidation
- Per-user cache keys (user ID in key parts)
- Tag-based invalidation on mutations (via `revalidateTag`)
- Reduces backend API calls for repeated page loads

### 1.3 Combined Flow

```
Browser Request
  → Next.js Data Cache (hit?) → Return cached
  → serverFetch to backend
    → Redis Cache (hit?) → Return cached
    → Database Query → Cache in Redis → Return
  → Cache in Next.js → Return to browser
```

---

## 2. Database Query Optimization

### 2.1 Read Optimization

- Heavy read queries are cached in Redis (user profiles, progress, blocks, admin lists)
- Reference data (interest tags, changelogs) cached with 24-hour TTL
- Admin queries use filter-hash-based cache keys for parametric caching

### 2.2 Atomic Operations via RPC

Economy-critical operations (conversion, purchases, check-ins, prestige) are implemented as database RPC functions:
- Single round-trip for complex multi-table operations
- Transaction isolation guaranteed by Postgres
- Validation and mutation in same transaction

### 2.3 Batch Loading

Matchmaking loads data for all queue candidates in parallel:
```
Promise.all([
  loadInterestTags(userIds),
  loadFavorites(userIds),
  loadBlockedSets(userIds),
  loadEmbeddings(userIds),
])
```

### 2.4 View-Based Aggregation

Database views pre-join commonly accessed data:
- `admin_users_unified` -- Aggregates user data for admin dashboard
- `public_user_info` -- Minimal public profile data
- `changelogs_with_creator` -- Changelogs with author details

---

## 3. Real-Time System Tuning

### 3.1 Matchmaking Cycle

- Match cycle interval: 1 second
- Cleanup cycle: 30 seconds
- Maximum candidates per cycle: 50
- In-process lock prevents concurrent match cycles

### 3.2 Room Heartbeat

- Heartbeat interval: 4 seconds
- Detects disconnected rooms
- Lightweight payload (`{ timestamp, roomId }`)

### 3.3 Socket.IO Configuration

- Transport: WebSocket only (`transports: ["websocket"]`)
- Max HTTP buffer size: 8MB (configurable)
- Reconnection: 5 attempts with 1s delay
- Path: `/ws`

---

## 4. Embedding Optimization

### 4.1 Change Detection

Source hash comparison avoids unnecessary Ollama API calls:
- SHA-256 hash of input text stored with embedding
- Hash comparison before regeneration (no embedding recomputation if profile unchanged)

### 4.2 Non-Blocking Generation

`setImmediate(() => runEmbeddingJob())` schedules embedding generation without blocking the request that triggered it.

### 4.3 Graceful Degradation

Missing embeddings contribute 0 to match scoring. The system operates correctly without any embeddings generated.

---

## 5. Frontend Performance

### 5.1 Server/Client Component Split

- Server components for data fetching (no client-side waterfall)
- Client components for interactivity
- Data passed as props from server to client components

### 5.2 Server Action Caching

- Queries wrapped in `withSentryQuery` use `unstable_cache`
- Per-user cache isolation
- Tag-based invalidation on mutations

### 5.3 Socket Connection Management

- Singleton socket manager (no duplicate connections)
- Token update via reconnect (not duplicate connection)
- `destroySockets()` cleanup on unmount

---

## 6. EXP Today Counter

Redis `INCRBY` used for atomic, fast daily EXP tracking:
- Avoids database round-trip for counter updates
- Auto-expires at end of day
- Non-critical; fallback to database on Redis failure

---

## Related Components

- Caching: [10-caching-architecture.md](10-caching-architecture.md)
- Scalability: [19-scalability-strategy.md](19-scalability-strategy.md)
- Deployment: [17-deployment.md](17-deployment.md)

## Risk Considerations

- Two-layer cache creates potential for stale data if invalidation is not synchronized
- Database RPC functions shift complexity to the database layer, making debugging harder
- Match cycle O(n^2) scoring limits practical queue sizes
- Singleton socket manager means only one active connection per browser tab
