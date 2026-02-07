# Linky Backend

Express.js server providing REST API, WebRTC signaling, matchmaking, real-time messaging, and data persistence for Linky video chat platform. Built with domain-driven architecture and strict separation of concerns.

## Purpose

This backend handles:
- User authentication and profile management (Clerk integration)
- Matchmaking queue and peer pairing logic
- WebRTC signaling relay (SDP offers/answers, ICE candidates)
- Real-time Socket.IO event handling
- Chat message persistence and delivery
- User progress tracking (streaks, levels, favorites)
- Admin operations and system monitoring
- Semantic matching via embeddings (Ollama)
- File storage operations (AWS S3)
- Presence broadcasting (MQTT)

## Core Subsystems

### Authentication (Clerk)

**Clerk integration:**
- Validates JWT tokens on protected routes via middleware
- Webhook handler syncs user creation/updates to Supabase
- Custom JWT template includes user ID and role
- Token validation happens per-request with short circuit on invalid tokens

**Role-based access:**
- `member`: Standard user, can join calls and use app features
- `admin`: Access to admin dashboard, user management, system monitoring
- Middleware `requireAdmin` blocks non-admin users from admin routes

### Matchmaking

**Queue management:**
- Users join queue via Socket.IO `join` event
- MatchmakingService stores queue state in Redis or in-memory
- Feature flag `USE_REDIS_MATCHMAKING` selects implementation
- Idempotent enqueue: Updates socketId if user already queued

**Matching algorithm:**
- Basic matcher: Pairs first two users in queue (random)
- Scoring matcher: Uses embeddings to calculate compatibility score
- Matching runs on 1-second interval
- Creates private room for matched pair

**State stores:**
- `RedisMatchStateStore`: Multi-instance compatible, uses Lua scripts for atomicity
- `MemoryMatchStateStore`: Single-instance only, in-memory Map with TTL

**Cleanup:**
- Periodic cleanup (30s interval) removes stale entries (TTL-based)
- Socket disconnect triggers immediate dequeue if user in active room
- Namespace disconnect does NOT dequeue unless in active room (transient reconnects)

### Video Chat Signaling (Socket.IO)

**Namespace: `/chat`**

Socket.IO relays WebRTC signaling between peers. Backend does NOT handle media streams.

**Event handlers:**
- `join`: Add user to matchmaking queue
- `signal`: Relay signaling data (offer, answer, ICE) to peer in same room
- `skip`: Remove user from current room, re-add to queue
- `end-call`: End call, do NOT re-queue
- `chat:send`: Persist and relay text message
- `chat:attachment:send`: Upload file to S3, persist message, relay
- `mute-toggle`, `video-toggle`, `screen-share:toggle`: Relay control state to peer
- `favorite:notify-peer`: Notify peer they've been favorited

**Room lifecycle:**
1. Two users matched, room created with unique ID
2. Both users receive `matched` event with `roomId`, `peerId`, `isOfferer` flag
3. Users exchange signaling via `signal` events
4. Room persists until disconnect, skip, or end-call
5. On teardown, both sockets leave room, room deleted from RoomService

**Heartbeat:**
- Backend emits `room-ping` to both users every 4 seconds
- Frontend responds with `room-pong`
- If both sockets dead (not connected), room deleted and users dequeued

### WebRTC ICE / TURN

**Cloudflare TURN API:**
- Endpoint: `GET /api/ice-servers`
- Fetches TURN credentials from Cloudflare API
- Response cached for 1 hour to reduce API calls
- Returns ICE server configuration for RTCPeerConnection

**ICE server structure:**
```json
{
  "iceServers": [
    {
      "urls": [
        "stun:stun.cloudflare.com:3478",
        "turn:turn.cloudflare.com:3478?transport=udp",
        "turn:turn.cloudflare.com:3478?transport=tcp",
        "turns:turn.cloudflare.com:5349?transport=tcp"
      ],
      "username": "<generated>",
      "credential": "<generated>"
    }
  ]
}
```

Requires `CLOUDFLARE_TURN_API_TOKEN` and `CLOUDFLARE_TURN_KEY_ID` environment variables.

### Chat Events

**Message flow:**
1. User emits `chat:send` with message payload
2. Backend validates message (rate limiting, content checks)
3. Message persisted to Supabase `chat_messages` table
4. Message relayed to peer via `chat:message` event
5. Acknowledgment sent back to sender

**Attachment flow:**
1. User emits `chat:attachment:send` with file metadata
2. Backend generates presigned S3 upload URL
3. Frontend uploads file directly to S3
4. Backend persists message with S3 key
5. Message relayed to peer with presigned download URL

**Message types:**
- `text`: Plain text message
- `image`: Image attachment (PNG, JPG, etc.)
- `file`: Generic file attachment

### Favorites, Streaks, Levels

**Favorites:**
- Users can favorite peers during or after calls
- Stored in `user_favorites` table
- Increases chance of future match (scoring algorithm)
- Peer receives real-time notification via Socket.IO

**Streaks:**
- Days of consecutive usage
- Calculated from visit timestamps in `user_visits` table
- Resets if user misses a day (no grace period)
- Displayed on user profile

**Levels:**
- Calculated from total call time and other metrics
- Levels 1-50 with increasing XP requirements
- Unlocks badges and UI customizations
- Progress tracked in `user_progress` table

### Embeddings and Matching

**Ollama integration:**
- Generates embeddings from user interests and bio
- Stored in Supabase with pgvector extension
- Cosine similarity used for compatibility scoring
- Matching algorithm prioritizes high-scoring pairs

**Embedding generation:**
- Triggered on user profile update
- Uses `nomic-embed-text` model via Ollama API
- Embedding stored in `user_embeddings` table
- Future: Real-time semantic matching in matchmaking queue

## Redis Usage

**Cache responsibilities:**
- User profiles (TTL: 15 minutes)
- User progress (streaks, levels, favorites) (TTL: 5 minutes)
- Admin dashboard data (user list, visits) (TTL: 1 minute)
- ICE server configuration (TTL: 1 hour)

**Matchmaking state (optional):**
- Queue state stored in Redis Sorted Set (score = enqueue timestamp)
- User metadata stored in Redis Hash
- Lua scripts ensure atomic enqueue/dequeue operations
- Fallback: MemoryMatchStateStore if Redis unavailable

**Cache guarantees:**
- Redis is NEVER source of truth
- All writes go to Supabase first, then invalidate cache
- Cache misses trigger fetch from Supabase
- Cache-aside pattern: `getOrSet(key, fetchFn, ttl)`

**Cache invalidation:**
- Manual: `invalidate(key)` or `invalidateByPrefix(prefix)`
- Automatic: TTL expiration
- On write: Service layer invalidates affected keys

## Supabase Usage

**Database responsibilities:**
- User profiles and metadata
- Chat message history
- Call history and visit tracking
- User favorites and blocked users
- Embeddings (pgvector)
- Admin data (user visits, reports)

**Repository pattern:**
- Repositories in `infra/supabase/repositories/`
- Each repository handles one table or view
- No business logic in repositories (data access only)
- Services call repositories for data operations

**Views:**
- `user_profiles_with_stats`: User data with aggregated stats
- `user_visit_summary`: Visit counts and streaks
- Optimize complex queries and reduce roundtrips

**Connection management:**
- Supabase client singleton in `infra/supabase/client.ts`
- Connection pooling via Supabase pooler
- Timeout: 10 seconds per query (configurable)

## Socket Namespaces

**`/chat` namespace:**
- Video chat signaling and matchmaking
- Auth required: Socket middleware validates Clerk token
- Events: join, signal, skip, end-call, chat:send, mute-toggle, etc.
- Handlers: `domains/video-chat/socket/handlers.ts`

**`/admin` namespace:**
- Real-time admin dashboard updates
- Auth required: Admin role check in middleware
- Events: user presence updates, system stats
- Handlers: `domains/admin/socket/admin.socket.ts`

**Default namespace (`/`):**
- Not used, clients must connect to specific namespace

## Environment Variables

Backend requires these environment variables in `apps/api/.env`:

```env
# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Redis
REDIS_URL=redis://localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# MQTT
MQTT_CLIENT_URL=mqtt://localhost
MQTT_CLIENT_PORT=1883
MQTT_CLIENT_WS_PORT=8083
MQTT_CLIENT_USERNAME=
MQTT_CLIENT_PASSWORD=

# AWS S3
S3_BUCKET=linky-uploads
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...

# Cloudflare TURN
CLOUDFLARE_TURN_API_TOKEN=...
CLOUDFLARE_TURN_KEY_ID=...

# Ollama
OLLAMA_URL=http://localhost:11434

# Matchmaking (feature flag)
USE_REDIS_MATCHMAKING=false

# Cache
CACHE_NAMESPACE_VERSION=v1

# Web Push (VAPID)
VAPID_SUBJECT=mailto:admin@linky.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

## Development

**Run backend only:**

```bash
cd apps/api
pnpm dev
```

Server runs on `http://localhost:3001` (or `PORT` env var).

**Prerequisites:**
- Redis running on localhost:6379 (optional, falls back to in-memory)
- Supabase project with tables and views created
- Clerk account with webhook configured
- MQTT broker running (optional)
- AWS S3 bucket for file uploads

**Type checking:**

```bash
cd apps/api
pnpm check-types
```

This is CRITICAL before committing backend changes. Type errors will break production build.

**Linting:**

```bash
pnpm lint
```

**Building:**

```bash
pnpm build
pnpm start
```

## Testing Strategy

**Unit tests (Vitest):**

Located in `src/__tests__/` with same directory structure as `src/`.

```bash
cd apps/api
pnpm vitest run                                      # All tests
pnpm vitest run src/__tests__/cache                  # Cache tests
pnpm vitest run src/__tests__/domains/matchmaking    # Matchmaking tests
```

**Test categories:**
- Cache tests: `getOrSet`, invalidation, expiration
- Domain service tests: Matchmaking, admin, user progress
- Repository tests: Supabase data access (mocked)
- Utility tests: Hashing, date helpers, validators

**Mocking:**
- External services mocked (Redis, Supabase, S3, Clerk)
- Use Vitest `vi.mock()` for module mocks
- Use `vi.fn()` for function mocks

**Coverage:**

```bash
pnpm vitest run --coverage
```

Target: 80% coverage for domain services.

## Matchmaking Lifecycle

1. **User connects**: Socket.IO connection with Clerk auth token
2. **Join queue**: User emits `join`, added to MatchmakingService queue
3. **Periodic matching**: Backend runs `tryMatch()` every 1 second
4. **Match found**: Two users paired, room created, both receive `matched` event
5. **Signaling**: Users exchange `signal` events via backend relay
6. **Call active**: Room persists, heartbeat pings every 4 seconds
7. **Call end**: User emits `end-call` or disconnects, room deleted, peer notified

**Edge cases:**
- User disconnects during queue: Remains queued, socketId updated on reconnect
- User disconnects during call: Room deleted, peer receives `peer-left`
- Both users disconnect: Room deleted by heartbeat cleanup
- User skips: Room deleted, user re-added to queue, peer receives `peer-skipped`

## Cleanup and Resilience

**Matchmaking cleanup (30s interval):**
- Removes entries older than TTL (5 minutes)
- Only runs if store supports cleanup (Redis and Memory do)
- Logs cleanup count at DEBUG level

**Room cleanup (heartbeat):**
- Pings both users in room every 4 seconds
- If both sockets disconnected, deletes room and dequeues users
- If one socket disconnected, waits for reconnect or peer action

**Socket disconnect handling:**
- Transport disconnect: Immediate dequeue, room teardown
- Namespace disconnect: Only dequeue if in active room (not if queued)
- Reason: Transient namespace disconnects should not lose queue position

**Database connection resilience:**
- Supabase queries timeout after 10 seconds
- Failed queries logged at ERROR level
- Frontend receives error response, can retry

**Cache failure handling:**
- Redis connection errors logged at WARN level
- Service falls back to direct Supabase query
- Cache reads considered non-critical (graceful degradation)

## Project Structure

```
apps/api/src/
├── domains/                    Business logic by domain
│   ├── user/                   User profiles, auth sync
│   ├── video-chat/             WebRTC signaling, rooms
│   ├── matchmaking/            Queue, matching, scoring
│   ├── admin/                  Admin dashboard, user management
│   ├── reports/                User reports, moderation
│   ├── embeddings/             Semantic embeddings
│   └── notification/           Push notifications
│
├── infra/                      External integrations
│   ├── redis/                  Cache client and utilities
│   ├── supabase/               Database client and repositories
│   ├── s3/                     S3 client and operations
│   ├── clerk/                  Clerk validation
│   ├── mqtt/                   MQTT client
│   ├── ollama/                 Embedding generation
│   └── push/                   Web push notifications
│
├── socket/                     Socket.IO server setup
│   ├── index.ts                Server creation, namespace setup
│   ├── auth.ts                 Socket auth middleware
│   └── handlers.ts             Connection/disconnect logging
│
├── routes/                     HTTP route composition
│   ├── api.ts                  API v1 routes
│   └── index.ts                Route mounting
│
├── contexts/                   Cross-domain orchestration
│   └── user-sync.context.ts    Example: User creation across domains
│
├── middleware/                 Express middleware
│   ├── auth.ts                 Clerk token validation
│   ├── admin.ts                Admin role check
│   ├── rate-limit.ts           Rate limiting
│   └── shutdown.ts             Graceful shutdown
│
├── types/                      Shared TypeScript types
│   ├── socket.types.ts         Socket.IO event types
│   ├── database/               Database table types
│   └── api.types.ts            REST API types
│
├── config/                     Environment config
│   └── index.ts                Config object with validation
│
├── utils/                      Utility functions
│   ├── cors.ts                 CORS origin parsing
│   └── date.ts                 Date helpers
│
├── __tests__/                  Vitest unit tests
│   ├── cache/                  Cache tests
│   └── domains/                Domain service tests
│
├── server.ts                   Express server setup
└── index.ts                    Entry point, server start
```

## Adding New Features

**Adding a new domain:**

1. Create `domains/<domain-name>/`
2. Add subdirectories: `http/`, `service/`, `socket/`, `types/`
3. Export public API from `index.ts`
4. Wire HTTP routes in `routes/api.ts`
5. Wire Socket handlers in `socket/index.ts` (if needed)

**Adding a new route:**

```typescript
// domains/example/http/example.route.ts
import { Router } from "express";
import { requireAuth } from "@/middleware/auth.js";
import { exampleService } from "../service/example.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const data = await exampleService.getData(req.userId);
  res.json(data);
});

export default router;
```

Wire in `routes/api.ts`:
```typescript
import exampleRouter from "@/domains/example/http/example.route.js";
router.use("/example", exampleRouter);
```

**Adding cache:**

Define key in `infra/redis/cache/keys.ts`:
```typescript
export const exampleKey = (id: string) => `example:${id}`;
```

Define TTL in `infra/redis/cache/policy.ts`:
```typescript
export const EXAMPLE_TTL = 5 * 60; // 5 minutes
```

Use in service:
```typescript
import { cache } from "@/infra/redis/cache/index.js";
import { exampleKey } from "@/infra/redis/cache/keys.js";
import { EXAMPLE_TTL } from "@/infra/redis/cache/policy.js";

const data = await cache.getOrSet(
  exampleKey(id),
  async () => await repository.fetchData(id),
  EXAMPLE_TTL
);
```

Invalidate on write:
```typescript
await repository.updateData(id, newData);
await cache.invalidate(exampleKey(id));
```
