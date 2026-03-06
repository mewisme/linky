# 19 -- Scalability Strategy

## Purpose

This document describes the scalability architecture and horizontal scaling strategy for the Linky platform, including the hybrid Redis/in-memory approach, stateful component limitations, and recommended scaling paths.

## Scope

Covers current scalability characteristics, bottlenecks, and the Redis vs in-memory matchmaking decision.

## Dependencies

- [17-deployment.md](17-deployment.md) for deployment topology
- [18-performance-strategy.md](18-performance-strategy.md) for optimization context

## Cross References

- [04-video-chat-system.md](04-video-chat-system.md) for in-memory room state
- [05-matchmaking.md](05-matchmaking.md) for matchmaking store abstraction

---

## 1. Current Architecture: Single Server

The current deployment runs a single API server instance. This section documents the components and their scalability characteristics.

### 1.1 Stateless Components

These components can scale horizontally without modification:
- HTTP route handlers (stateless, auth via JWT)
- Database queries (Supabase handles connection pooling)
- Cache operations (Redis is external)
- Webhook processing (idempotent)

### 1.2 Stateful Components

These components hold in-process state and require coordination for multi-instance scaling:

| Component | State Location | Scaling Challenge |
|-----------|---------------|-------------------|
| Room Service | In-memory Map | Rooms must be on same server as both participants |
| Matchmaking Queue (Memory mode) | In-memory Map | Queue must be shared across instances |
| Match Lock | In-memory boolean | Only protects single instance |
| Notification Context | In-memory reference | Socket lookup is per-server |

---

## 2. Hybrid Matchmaking Strategy

### 2.1 Store Abstraction

The matchmaking system uses a `MatchStateStore` interface with two implementations:

| Store | Configuration | Pros | Cons |
|-------|--------------|------|------|
| `MemoryMatchStateStore` | `USE_REDIS_MATCHMAKING=false` | Zero latency, simple | Single-instance only |
| `RedisMatchStateStore` | `USE_REDIS_MATCHMAKING=true` | Multi-instance ready | Higher latency per operation |

### 2.2 Redis Store Capabilities

The Redis store enables:
- Queue shared across multiple API instances
- User data cached in Redis (interests, favorites, blocks)
- Skip cooldown tracked in Redis
- Queue ownership verified per socket

### 2.3 Remaining Challenges

Even with Redis matchmaking:
- Room state remains in-memory (matched pairs must stay on same server)
- Match lock uses in-process boolean (not distributed)
- Socket event delivery is per-server (Socket.IO adapter needed for multi-server)

---

## 3. Scaling Path

### 3.1 Phase 1: Current (Single Server)

- Single Docker container for API
- In-memory rooms and matchmaking
- Suitable for: Early/moderate user base

### 3.2 Phase 2: Redis Matchmaking (Implemented)

- Enable `USE_REDIS_MATCHMAKING=true`
- Queue operations shared via Redis
- Rooms still in-memory (sticky sessions needed)
- Suitable for: Moderate user base, single-server scaling up

### 3.3 Phase 3: Multi-Server (Not Yet Implemented)

Required additions:
1. **Socket.IO Redis Adapter** -- Share socket events across servers
2. **Distributed Room State** -- Move room data to Redis
3. **Distributed Match Lock** -- Use Redis `SET NX` with TTL
4. **Load Balancer** -- With sticky sessions (by user ID or socket ID)
5. **Notification Context** -- Use Socket.IO adapter for cross-server socket lookup

### 3.4 Phase 4: Horizontal Scaling (Not Yet Implemented)

Additional requirements:
1. **Ollama Scaling** -- Multiple Ollama instances behind load balancer
2. **Redis Cluster** -- For cache and matchmaking at scale
3. **Database Read Replicas** -- For read-heavy queries
4. **CDN for Media** -- S3 + CloudFront for media serving

---

## 4. Bottleneck Analysis

### 4.1 Matchmaking

- O(n^2) pairwise scoring with n up to 50
- Embedding loading from Supabase on each cycle
- 1-second cycle interval

Mitigation: MAX_MATCHING_CANDIDATES caps evaluation at 50 users per cycle.

### 4.2 Database

- All writes go through Supabase (external)
- RPC functions serialize complex operations
- No connection pooling configuration documented

Mitigation: Redis caching reduces read load; RPC functions reduce round-trips.

### 4.3 Ollama

- Single Ollama instance for embeddings
- 60-second timeout per embedding generation
- Sequential processing within a single job

Mitigation: Non-blocking scheduling (`setImmediate`); change detection avoids unnecessary regeneration.

### 4.4 Socket.IO

- Single namespace for all chat connections
- Room heartbeat iterates all rooms every 4 seconds
- Signal relay is synchronous per-event

Mitigation: Lightweight payloads; rate limiting on signals and reactions.

---

## 5. Redis Availability Strategy

### 5.1 Cache Operations

Redis cache failures are non-fatal:
- Read failures: fall through to database
- Write failures: data not cached, served from DB next time
- Delete failures: stale data until TTL expiry

### 5.2 Rate Limiting

Redis unavailability bypasses rate limiting entirely (fail-open).

### 5.3 Admin Role Cache

Redis unavailability falls back to database query for admin role verification.

### 5.4 Matchmaking (Redis Mode)

Redis unavailability in matchmaking mode would prevent queue operations. No in-memory fallback is implemented when Redis matchmaking is enabled.

---

## Related Components

- Deployment: [17-deployment.md](17-deployment.md)
- Performance: [18-performance-strategy.md](18-performance-strategy.md)
- Caching: [10-caching-architecture.md](10-caching-architecture.md)

## Risk Considerations

- Single-server architecture is a single point of failure
- No automated failover or health-based routing
- Redis matchmaking without distributed room state creates a partial multi-server solution
- Socket.IO Redis adapter is not yet integrated
- Ollama is a single instance with no redundancy
- No auto-scaling mechanism documented
