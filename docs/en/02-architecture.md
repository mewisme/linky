# 02 -- System Architecture

## Purpose

This document describes the complete system architecture of the Linky platform, including the backend domain-driven design model, frontend layered architecture, data flow patterns, cross-domain coordination, and the hybrid server/client rendering strategy.

## Scope

Covers architectural decisions, layer boundaries, dependency rules, and data flow for both backend and frontend applications.

## Dependencies

- [01-overview.md](01-overview.md) for technology stack context

## Cross References

- [10-caching-architecture.md](10-caching-architecture.md) for Redis integration details
- [12-database-schema.md](12-database-schema.md) for data model
- [17-deployment.md](17-deployment.md) for infrastructure topology

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  Next.js App  │  │  Socket.IO   │  │   MQTT Client     │ │
│  │  (React 19)   │  │  Client      │  │   (Presence)      │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────────┘ │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │ HTTPS            │ WSS              │ WSS
          ▼                  ▼                  ▼
┌─────────────────┐  ┌──────────────┐  ┌───────────────────┐
│  Vercel Edge    │  │  Express.js  │  │   MQTT Broker     │
│  (Next.js SSR)  │  │  + Socket.IO │  │   (External)      │
└────────┬────────┘  └──────┬───────┘  └───────────────────┘
         │                  │
         │    ┌─────────────┼─────────────┐
         │    │             │             │
         ▼    ▼             ▼             ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Supabase │    │  Redis   │    │  Ollama  │
    │ (Postgres│    │  Cache   │    │ Embeddings│
    │ + pgvec) │    │          │    │          │
    └──────────┘    └──────────┘    └──────────┘
         │
    ┌────┴────┐
    │   S3    │
    │ Storage │
    └─────────┘
```

---

## 2. Backend Architecture

### 2.1 Layer Model

The backend follows a strict layered architecture:

```
┌─────────────────────────────────────────┐
│              Routes Layer               │
│  (Express route composition, mounting)  │
├─────────────────────────────────────────┤
│            Middleware Layer              │
│  (Auth, Admin, Rate Limit, Shutdown)    │
├─────────────────────────────────────────┤
│       ┌─────────────────────┐           │
│       │   Contexts Layer    │           │
│       │ (Cross-Domain Orch) │           │
│       └──────────┬──────────┘           │
│                  │                      │
│    ┌─────────────┼─────────────┐        │
│    ▼             ▼             ▼        │
│ ┌────────┐ ┌──────────┐ ┌──────────┐   │
│ │Domain A│ │ Domain B │ │ Domain C │   │
│ │ http/  │ │ http/    │ │ http/    │   │
│ │service/│ │ service/ │ │ service/ │   │
│ │socket/ │ │ socket/  │ │ types/   │   │
│ │types/  │ │ types/   │ │          │   │
│ └────┬───┘ └────┬─────┘ └────┬─────┘   │
│      │          │            │          │
├──────┼──────────┼────────────┼──────────┤
│      ▼          ▼            ▼          │
│           Infrastructure Layer          │
│  (Redis, Supabase, S3, MQTT, Clerk,    │
│   Ollama, Push)                         │
└─────────────────────────────────────────┘
```

### 2.2 Domain Isolation Rule

**Fundamental invariant: Domains must NOT import other domains.**

Each domain in `apps/api/src/domains/` is a self-contained bounded context. When a feature requires coordination across multiple domains, the `contexts/` layer serves as the orchestration point.

Implemented contexts:
- `broadcast-context.ts` -- Coordinates admin broadcasts across notification and socket systems
- `peer-action-notification-context.ts` -- Coordinates push notifications during video chat based on visibility state
- `economy-stabilizer.context.ts` -- Reads economy metrics, adjusts economy configuration parameters
- `report-context.ts` -- Coordinates report creation with context enrichment

### 2.3 Domain Registry

| Domain | Responsibilities |
|--------|-----------------|
| `user` | User profiles, details, settings, levels, streaks, blocks, progress tracking, embedding job scheduling, feature unlocks, streak freezes |
| `video-chat` | WebRTC room management, signaling relay, call lifecycle, call history recording |
| `matchmaking` | Queue management, candidate scoring, embedding similarity, Redis/Memory state stores |
| `reports` | User report submission, admin report review, report context enrichment |
| `admin` | Administrative CRUD for all configurable resources, economy statistics, simulation, broadcasts |
| `embeddings` | Cosine similarity computation service |
| `notification` | Notification persistence, socket delivery, push notification delivery |
| `economy` | Wallet management, coin ledger, EXP-to-coin conversion |
| `economy-shop` | Virtual item shop, purchase transactions |
| `economy-boost` | Temporary experience multiplier boosts |
| `economy-daily` | Daily EXP milestone tracking (600s, 1800s, 3600s thresholds) |
| `economy-weekly` | 7-day weekly check-in streak with escalating coin rewards |
| `economy-monthly` | Calendar-based monthly check-in with buyback mechanics |
| `economy-season` | Seasonal period management, coin decay at season end |
| `economy-prestige` | Prestige reset system with vault bonuses and rank progression |

### 2.4 Infrastructure Layer

Located in `apps/api/src/infra/`, this layer encapsulates all external system integrations. No business logic resides here.

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `redis/` | Cache operations, key management, timeout wrapping | `getOrSet`, `invalidate`, `invalidateByPrefix`, `withRedisTimeout` |
| `supabase/` | Database repositories for all tables | Per-table repository modules |
| `s3/` | Object storage operations | `getPresignedUploadUrl`, S3 client |
| `clerk/` | Clerk SDK client, token verification | `clerk`, `verifyToken` |
| `ollama/` | Embedding generation via Ollama API | `embedText` |
| `mqtt/` | MQTT client for presence | `mqttClient` |
| `push/` | Web Push notification sending | `sendPushNotification` |
| `admin-cache/` | Admin role caching in Redis with 5-min TTL | `checkIfUserIsAdmin`, `getAdminRole` |

### 2.5 Route Composition

Routes are composed in `apps/api/src/routes/index.ts`:

```
/ (root)                         → Status JSON
/healthz                         → Health check
/health                          → Health check (alias)
/webhook                         → Clerk webhooks (NO auth)
/api/v1/interest-tags            → Public interest tags (NO auth)
/api/v1/changelogs               → Public changelogs (NO auth)
/api/v1/matchmaking              → Queue status (NO auth)
─── Clerk Auth Middleware Applied ───
/api/v1/users/*                  → User domain routes
/api/v1/call-history             → Call history
/api/v1/reports                  → Reports
/api/v1/favorites                → Favorites
/api/v1/video-chat               → Video chat
/api/v1/notifications            → Notifications
/api/v1/push                     → Push subscriptions
/api/v1/economy/*                → Economy domain routes
/api/v1/s3                       → S3 presigned URLs
/api/ice-servers                 → TURN credentials
─── Admin Middleware Applied ───
/api/v1/admin/*                  → Admin domain routes
```

---

## 3. Frontend Architecture

### 3.1 Layer Model

```
┌──────────────────────────────────────┐
│              app/ Layer              │
│  (Routing, layouts, page composition)│
├──────────────────────────────────────┤
│           features/ Layer            │
│  (Use-case UI, hooks, API per feat.) │
├──────────────────────────────────────┤
│           entities/ Layer            │
│  (Domain models, types, shared data) │
├──────────────────────────────────────┤
│            shared/ Layer             │
│  (Reusable components, utils, hooks) │
├──────────────────────────────────────┤
│              lib/ Layer              │
│  (HTTP, auth, cache, realtime, etc.) │
└──────────────────────────────────────┘
```

Dependency direction: **inward only** (app can import features, features can import entities, etc.).

### 3.2 Server/Client Component Pattern

Pages follow a consistent split:
1. `page.tsx` is a server component that fetches data via `serverFetch()` with `withSentryQuery()`
2. A sibling `*-client.tsx` file handles client-side interactivity
3. Server component passes fetched data as props to client component

Server data fetching pattern:
```
withSentryQuery("queryName", (token) =>
  serverFetch(url, { preloadedToken: token }),
  { keyParts: [...], tags: [...] }
)
```

Server action pattern:
```
withSentryAction("actionName", () =>
  serverFetch(url, { method: "POST", body: ... })
)
```

### 3.3 Route Groups

| Group | Path | Purpose | Auth Required |
|-------|------|---------|---------------|
| `(app)` | `/chat`, `/user/*`, `/settings/*`, `/connections/*`, `/admin/*` | Authenticated application pages | Yes |
| `(auth)` | `/sign-in`, `/sign-up`, `/reset-password` | Authentication flows | No |
| `(marketing)` | `/`, `/privacy`, `/terms`, `/cookies`, `/changelogs/*` | Public marketing pages | No |

### 3.4 State Management

- **Zustand**: Client-side application state (e.g., call state, UI preferences)
- **TanStack React Query**: Server state caching and synchronization
- **Next.js Data Cache**: Server-side data caching via `unstable_cache` with tag-based revalidation
- **Socket.IO**: Real-time event-driven state updates
- **MQTT**: Presence state (online/offline)

---

## 4. Data Flow Patterns

### 4.1 Authenticated API Request Flow

```
Browser → Next.js Server Component
  → Clerk auth() → getToken()
  → serverFetch(backendUrl, { preloadedToken })
    → HTTP GET/POST to Express API
      → clerkMiddleware (verify JWT)
      → Route Handler
        → Service Layer
          → Repository (Supabase query)
          → Cache Layer (Redis getOrSet)
        → JSON Response
      ← Response to Next.js
    ← Props to Client Component
  ← Rendered HTML to Browser
```

### 4.2 Socket.IO Connection Flow

```
Browser → Socket.IO Client (createNamespaceSockets)
  → WSS connection to /ws path
  → Namespace: /chat or /admin
    → socketAuthMiddleware (verify Clerk JWT)
    → [/admin only] adminNamespaceAuthMiddleware (check Redis admin cache)
    → "connection" event
    → setupSocketHandlers (register per-socket event handlers)
```

### 4.3 Video Chat Call Flow

```
User A joins queue → "join" event → matchmaking.enqueue()
User B joins queue → "join" event → matchmaking.enqueue()
                                      ↓
                    Matchmaking interval (1s)
                    → tryMatch() → scoring → best pair selected
                    → dequeue both users
                    → emit "matched" to both sockets
                                      ↓
                    WebRTC Signaling (via "signal" events)
                    → SDP offer/answer exchange
                    → ICE candidate exchange
                    → Peer connection established
                                      ↓
                    Call Active (room-ping heartbeat every 4s)
                    → chat messages, reactions, mute/video toggle
                                      ↓
                    "end-call" event → record call history
                    → apply EXP + streak for both users
                    → delete room
```

### 4.4 Economy Transaction Flow

```
Call ends → recordCallHistoryInDatabase()
  → applyCallProgressForUser() [for each participant]
    → addCallExp(userId, durationSeconds)
      → check streak bonus multiplier
      → check favorite exp boost rules
      → increment EXP (via DB or RPC)
      → increment daily EXP with milestones
      → check level-up → grant rewards
    → addCallDurationToStreak(userId, duration)
      → check streak freeze for gaps
      → upsert streak day
      → invalidate progress cache
```

---

## 5. Concurrency and Race Condition Handling

### 5.1 Matchmaking Lock

The matchmaking service uses an in-process boolean lock (`matchLock`) to prevent concurrent `tryMatch()` execution. This ensures only one match cycle runs at a time per server instance.

Limitation: This lock is per-process only. In a multi-server deployment, separate lock coordination (e.g., Redis distributed lock with `LOCK_KEY = "match:lock"` and `LOCK_TTL = 2`) would be needed. The Redis lock key and TTL constants are defined but the distributed lock is not currently implemented in the match cycle.

### 5.2 Database-Level Atomicity

Economic transactions (coin purchases, EXP conversion, weekly/monthly check-ins, prestige) are implemented as Postgres RPC functions, ensuring atomicity at the database level. Each RPC:
- Validates preconditions within the transaction
- Raises named exceptions (e.g., `INSUFFICIENT_COINS`, `ALREADY_CLAIMED`)
- Returns updated balances as part of the result

### 5.3 Cache Invalidation Ordering

Cache invalidation follows a write-then-invalidate pattern:
1. Write to database
2. Invalidate relevant Redis cache keys
3. Return response

This ensures stale reads are bounded by the time between database write and cache invalidation.

### 5.4 Socket Event Ordering

Socket.IO guarantees per-connection message ordering. The system relies on this for:
- Signal relay ordering (SDP offer before ICE candidates)
- Chat message ordering within a room
- Notification delivery ordering per user

---

## Related Components

- Cache implementation details: [10-caching-architecture.md](10-caching-architecture.md)
- Database schema: [12-database-schema.md](12-database-schema.md)
- Socket events: [13-socket-events-map.md](13-socket-events-map.md)
- API contracts: [14-api-contracts.md](14-api-contracts.md)

## Risk Considerations

- In-process matchmaking lock does not coordinate across multiple server instances
- Room state is held in-memory (not persisted); server restart loses active rooms
- Domain isolation rule requires disciplined enforcement during development
- Frontend layer dependency rules require static analysis or manual review to verify
