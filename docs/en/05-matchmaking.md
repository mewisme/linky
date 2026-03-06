# 05 -- Matchmaking System

## Purpose

This document describes the matchmaking engine that pairs users for video chat, including queue management, candidate scoring algorithm, embedding similarity integration, state store abstraction, and anti-abuse mechanisms.

## Scope

Covers the `matchmaking` domain, including `MatchmakingService`, `RedisMatchStateStore`, `MemoryMatchStateStore`, scoring service, and embedding score service.

## Dependencies

- [02-architecture.md](02-architecture.md) for domain model
- [06-embedding-system.md](06-embedding-system.md) for embedding vectors

## Cross References

- [04-video-chat-system.md](04-video-chat-system.md) for how matched pairs enter rooms
- [10-caching-architecture.md](10-caching-architecture.md) for Redis store details

---

## 1. Architecture

### 1.1 Component Overview

```
MatchmakingService (orchestrator)
  │
  ├── MatchStateStore (interface)
  │    ├── RedisMatchStateStore (production)
  │    └── MemoryMatchStateStore (development/fallback)
  │
  ├── ScoringService (candidate pair scoring)
  │
  └── EmbeddingScoreService (cosine similarity scoring)
```

### 1.2 Store Selection

Configured via `USE_REDIS_MATCHMAKING` environment variable:
- `"true"` → `RedisMatchStateStore`
- Any other value → `MemoryMatchStateStore`

Both stores implement the same `MatchStateStore` interface, providing:
- Queue management (enqueue, dequeue, isInQueue)
- User data caching (interest tags, favorites, blocks)
- Skip cooldown tracking
- Queue ownership verification

---

## 2. Queue Management

### 2.1 Enqueue Flow

```
socket.on("join")
  │
  ▼
matchmaking.enqueue(socket)
  │
  ├── Validate Clerk user ID exists on socket
  ├── Validate socket is still connected
  ├── Resolve database user ID from Clerk user ID
  │    └── If no DB user → return false
  │
  ├── Check if user already in queue
  │    └── If not → cache user data (interests, favorites, blocks)
  │
  └── store.enqueueUser(dbUserId, socketId, socket)
       └── Returns true on success
```

### 2.2 Dequeue Flow

Users are dequeued in the following scenarios:
- Matched with a peer (reason: `"matched"`)
- Matched via fallback (reason: `"matched:fallback"`)
- Manual dequeue (reason: `"end-call"`, `"skip"`, `"removeUser"`)
- Stale socket detected (reason: `"cleanup:stale-socket"`, `"tryMatch:stale"`)
- Queue timeout (reason: `"expired"`)

### 2.3 Queue Ownership

The system tracks which socket ID owns a queue entry. The `dequeueIfOwner` method ensures only the socket that enqueued a user can dequeue them, preventing race conditions in multi-tab scenarios.

### 2.4 Queue Timeout

Users are automatically dequeued after 5 minutes in the queue. A `queue-timeout` event is emitted to the client socket.

---

## 3. Match Cycle

### 3.1 Execution

The match cycle runs every 1 second via `setInterval` in `setupMatchmakingInterval()`.

```
Every 1 second:
  │
  ├── Check queue size >= 2
  │    └── If < 2 → skip cycle
  │
  └── matchmaking.tryMatch(io)
       │
       ├── Acquire in-process lock (matchLock)
       │    └── If locked → skip cycle
       │
       ├── Get queued users (up to MAX_MATCHING_CANDIDATES = 50)
       │
       ├── Validate sockets (remove stale entries)
       │
       ├── Load data in parallel:
       │    ├── Interest tags (per user)
       │    ├── Favorites (per user)
       │    ├── Blocked users (per user)
       │    └── Embeddings (per user, from Supabase)
       │
       ├── Compute all pairwise scores:
       │    │
       │    │ For each pair (i, j):
       │    │   ├── Check blocked → skip if blocked
       │    │   ├── Check skip cooldown
       │    │   ├── Calculate favorite type (mutual/one-way/none)
       │    │   ├── Calculate embedding similarity (cosine)
       │    │   ├── Calculate base score (interests + fairness + embedding)
       │    │   ├── Apply favorite bonus (+10000 mutual, +5000 one-way)
       │    │   └── Store as ScoredCandidatePair
       │    │
       │    └── allCandidates[]
       │
       ├── Filter out skip-cooldown pairs (prefer non-skipped)
       │    └── If all have cooldown → use all as fallback
       │
       ├── Sort by: favoriteType > commonInterests > score
       │
       ├── Select best pair
       │    ├── Validate both sockets still connected
       │    ├── Dequeue both users
       │    └── Return matched pair with socket references
       │
       └── Release lock
```

### 3.2 Cleanup Intervals

Every 30 seconds, two cleanup operations run:
1. `cleanupStaleSockets(io)` -- Removes queue entries whose sockets are no longer connected (skips entries younger than 3 seconds to avoid race conditions)
2. `cleanupExpiredEntries(io)` -- Removes entries older than 5 minutes and emits `queue-timeout`

---

## 4. Scoring Algorithm

### 4.1 Score Components

Location: `apps/api/src/domains/matchmaking/service/scoring.service.ts`

| Component | Formula | Max Value |
|-----------|---------|-----------|
| Common Interests | `count * 100` | Unbounded |
| Both Have Tags Bonus | `50` (if common > 0 and both have tags) | 50 |
| Fairness Bonus | `min(avgWaitTimeSec * 0.1, 20)` | 20 |
| Embedding Score | `similarity * 25` (if similarity >= 0.3) | 25 |
| Favorite Bonus | `+10000` (mutual) or `+5000` (one-way) | 10000 |

### 4.2 Constants

```
SCORE_PER_COMMON_INTEREST = 100
BONUS_BOTH_HAVE_TAGS = 50
FAIRNESS_BONUS_PER_SECOND = 0.1
MAX_FAIRNESS_BONUS = 20
```

### 4.3 Embedding Score

Location: `apps/api/src/domains/matchmaking/service/embedding-score.service.ts`

```
DEFAULT_EMBEDDING_CONFIG = {
  embeddingWeight: 25,
  minSimilarityThreshold: 0.3
}

embeddingScore = similarity >= threshold ? similarity * weight : 0
```

Cosine similarity is computed pairwise for all candidates in the queue snapshot. The implementation uses a direct dot product / magnitude calculation.

### 4.4 Favorite Type Detection

```
calculateFavoriteType(favoritesA, favoritesB, userAId, userBId):
  - If A favorites B AND B favorites A → "mutual"
  - If A favorites B OR B favorites A → "one-way"
  - Otherwise → "none"
```

### 4.5 Candidate Comparison (Sort Order)

```
compareCandidates(a, b):
  1. favoriteType: mutual > one-way > none
  2. commonInterests: higher is better
  3. score: higher is better
```

---

## 5. Skip Cooldown

When a user skips their current match:
1. `matchmaking.recordSkip(skipperUserId, skippedUserId)` stores the skip pair
2. During the next match cycle, `store.hasSkip(userA, userB)` checks if the pair has a recent skip
3. Pairs with skip cooldown are deprioritized (moved to fallback pool)
4. If only skip-cooldown candidates are available, the best fallback is still matched

This prevents immediate re-matching of recently skipped pairs while not permanently blocking them.

---

## 6. Blocked User Filtering

During the match cycle:
- Each user's blocked user set is loaded
- If user A has blocked user B, or user B has blocked user A, the pair is entirely excluded from candidacy
- This is a hard filter (not a score penalty)

---

## 7. Queue Status Endpoint

Location: `apps/api/src/domains/video-chat/http/queue-status.route.ts`

`GET /api/v1/matchmaking/queue-status` (public, no auth required)

Returns:
```json
{
  "queueSize": 5,
  "estimatedWaitSeconds": null
}
```

Note: `estimatedWaitSeconds` is currently always `null` (not implemented).

---

## 8. Match Reasons

The system logs the reason for each match:
- `"mutual_favorite"` -- Both users are in each other's favorites
- `"one_way_favorite"` -- One user favorites the other
- `"common_interests"` -- Users share at least one interest tag
- `"general"` -- No specific affinity, matched by fairness bonus or default

---

## Related Components

- Embedding generation: [06-embedding-system.md](06-embedding-system.md)
- Video chat rooms: [04-video-chat-system.md](04-video-chat-system.md)
- Interest tags: [12-database-schema.md](12-database-schema.md)

## Risk Considerations

- In-process `matchLock` does not coordinate across multiple server instances
- MAX_MATCHING_CANDIDATES = 50 limits scoring to top 50 queue entries; users beyond this are not evaluated until earlier entries are matched or expire
- Pairwise scoring is O(n^2) with n up to 50, producing up to 1225 pairs per cycle
- Embedding loading from Supabase on every match cycle could become a bottleneck at scale
- Skip cooldown duration is managed by the state store implementation and may vary between Redis and Memory stores
- Queue timeout of 5 minutes is a hard-coded constant
