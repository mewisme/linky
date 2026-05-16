# Linky API (`@ws/api`)

Express 5 backend for Linky: REST (`/api/v1`), WebRTC signaling over Socket.IO, matchmaking, chat persistence, admin APIs, embeddings, push notifications, and background job execution. The codebase uses **domain-driven design** with strict layer boundaries.

Monorepo overview: [../../README.md](../../README.md).

## Quick start

From the repo root:

```bash
pnpm dev:api
# or
cd apps/api && pnpm dev
```

| Item | Default |
| --- | --- |
| Public HTTP | `http://localhost:7270` (`PORT`) |
| Internal worker HTTP | `127.0.0.1:7271` (`INTERNAL_API_PORT`) or Unix socket (`INTERNAL_API_SOCKET_PATH`) |
| Health | `GET /healthz`, readiness `GET /readyz` |
| Env file | Repo root [`.env`](../../.env) (loaded from `src/config/`) |

**Typical local dependencies:** Redis (queues + cache), Supabase, Clerk, S3. Without Redis the API starts but cache/queues degrade; matchmaking can use in-memory store via `USE_MEMORY_MATCHMAKING=true`.

```bash
pnpm check-types   # runs before build (prebuild)
pnpm lint
pnpm build && pnpm start
pnpm test          # vitest
```

## Architecture rules

| Rule | Detail |
| --- | --- |
| Domain isolation | `src/domains/*` must **not** import other domains |
| Cross-domain work | Only in `src/contexts/` |
| Integrations | `src/infra/` — Redis, Supabase, S3, Clerk, MQTT, Ollama, push; no business logic |
| HTTP wiring | `src/routes/` mounts routers; no business logic |
| Redis | Cache-aside only; **never** source of truth; failures logged and swallowed |
| Errors | `{ error, message }` JSON; log with Pino (`createLogger`) before responding |

### Dual HTTP listeners

The process exposes two listeners (see `server.ts`, `internal-server.ts`):

1. **Public** — Clerk-protected REST, webhooks, ICE servers, Socket.IO upgrade on the same HTTP server.
2. **Internal** — `/internal/worker/v1/*` for background workers only. Not reachable on the public port; in Docker, workers use a shared Unix socket. No bearer auth — network/listener segmentation is the boundary.

Job **handlers** live in this app (`src/worker/`, route handlers in `internal-worker.route.ts`); workers in `apps/worker` dequeue Redis jobs and POST to the internal listener.

## Domains

| Domain | Responsibility |
| --- | --- |
| `user` | Profiles, settings, blocks, streaks, levels, progress, prestige |
| `video-chat` | Rooms, signaling socket handlers, call history hooks, queue status HTTP |
| `matchmaking` | Queue, pairing (basic + embedding-weighted scoring), Redis/memory stores |
| `admin` | Users, config, interest tags, broadcasts, level rewards/unlocks, analytics socket |
| `reports` | User reports + admin moderation |
| `notification` | In-app notifications, Web Push (VAPID) |
| `embeddings` | Vector similarity helpers (Ollama jobs enqueue from contexts/worker routes) |

Each domain typically has `http/`, `service/`, optional `socket/`, `types/`, and `index.ts` exports.

## HTTP surface

| Prefix | Auth | Notes |
| --- | --- | --- |
| `/healthz`, `/readyz` | None | Liveness / dependency readiness |
| `/webhook` | Svix | Clerk user sync |
| `/api` | Mixed | ICE servers (`GET /api/ice-servers`) |
| `/api/v1/*` | Clerk (`clerkMiddleware`) | Main REST API |
| `/api/v1/admin/*` | Clerk + admin role | Admin CRUD |
| `/api/v1/interest-tags` | Public read | Tag catalog |
| `/api/v1/matchmaking` | Clerk | Queue status |

Admin access uses Redis-cached role checks (`infra/admin-cache/`). Roles include `admin` and `superadmin` (see `lib/auth/superadmin-invariants.ts`).

## Realtime (Socket.IO)

Clients connect to **namespaces**, not the default `/` namespace.

### `/chat` (video + matchmaking)

Auth: Clerk JWT in the handshake. The server relays signaling only (no media).

| Direction | Events (representative) |
| --- | --- |
| Client → server | `join`, `signal`, `skip`, `end-call`, `chat:send`, `chat:attachment:send`, `mute-toggle`, `video-toggle`, `screen-share:toggle`, `favorite:notify-peer` |
| Server → client | `joined-queue`, `matched`, `signal`, `peer-left`, `peer-skipped`, `end-call`, `chat:message`, control sync events |

**Lifecycle:** `join` → periodic matcher (~1s) → `matched` with `roomId`, `peerId`, `isOfferer` → SDP/ICE via `signal` → room heartbeat (`room-ping` / `room-pong`, ~4s) → teardown on `end-call`, `skip`, or disconnect rules.

Handlers live under `domains/video-chat/socket/` (`video-chat.socket.ts`, `matchmaking.socket.ts`, `setup-handlers/*`).

### `/admin`

Auth + admin role. Presence and dashboard realtime (`domains/admin/socket/admin.socket.ts`).

## Matchmaking

| Store | When |
| --- | --- |
| `RedisMatchStateStore` | Default when Redis is available |
| `MemoryMatchStateStore` | `USE_MEMORY_MATCHMAKING=true` (single instance) |

- **Basic matcher:** FIFO pair from queue.
- **Scoring matcher:** Embedding cosine similarity + favorites/history signals (`matcher.service.ts`, `scoring.service.ts`).
- Stale queue entries cleaned on an interval; disconnect behavior differs for queue vs active room (see domain socket helpers).

Embeddings are generated via Ollama (`OLLAMA_EMBEDDING_URL`, default model `bge-m3`) and stored in Supabase (pgvector). Regeneration is triggered from profile updates and worker jobs.

## Redis and cache

- Keys and TTLs: `infra/redis/cache/keys.ts`, `policy.ts`
- Pattern: `getOrSet(key, fetchFn, ttl)`; invalidate on writes
- Typical TTLs: profiles ~15m, progress ~5m, admin lists ~1m, ICE config ~1h
- All operations wrapped with `withRedisTimeout()` (default 5s)

## Background jobs

- **Enqueue:** `src/jobs/` (e.g. worker job envelopes to Redis via `@ws/sdk-internal`)
- **Execute:** Internal routes invoke `src/worker/` handlers (AI summaries, embedding regeneration, call EXP, etc.)
- **Cron:** `startJobs()` in `jobs/index.ts` (extend here for scheduled work)

Contracts: `@ws/shared-types`, `@ws/validation`, `@ws/worker-api`.

## Environment variables

Configuration is read in [`src/config/index.ts`](src/config/index.ts) from the **repo root** `.env`. Grouped overview:

| Group | Variables (representative) |
| --- | --- |
| Server | `PORT` (7270), `NODE_ENV`, `CORS_ORIGIN`, `INTERNAL_API_PORT`, `INTERNAL_API_SOCKET_PATH` |
| Clerk | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Redis | `REDIS_URL`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` |
| S3 | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` |
| TURN | `CLOUDFLARE_TURN_API_TOKEN`, `CLOUDFLARE_TURN_KEY_ID` |
| Ollama | `OLLAMA_EMBEDDING_URL`, `OLLAMA_EMBEDDING_MODEL`, `OLLAMA_CLOUD_MODEL`, `OLLAMA_API_KEY`, embed batching tunables |
| Matchmaking | `USE_MEMORY_MATCHMAKING` |
| Push | `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Ops | `CACHE_NAMESPACE_VERSION`, rate limits, timeouts, `JSON_BODY_SIZE_LIMIT` |

MQTT and other integrations are wired through `infra/` as needed for presence and external services.

## Project structure

```text
apps/api/src/
├── domains/           # Business logic (user, video-chat, matchmaking, admin, …)
├── contexts/          # Cross-domain orchestration
├── infra/             # External systems (redis, supabase, s3, clerk, ollama, push, …)
├── routes/            # Express composition (api.ts, internal-worker, webhooks, health)
├── socket/            # Socket.IO server bootstrap
├── jobs/              # Enqueue helpers
├── worker/            # Job handlers invoked by internal routes
├── middleware/        # Clerk, admin, rate limit, graceful shutdown
├── lib/               # Shared API helpers (user messages, postgrest, s3 scoping, …)
├── config/            # Env loading
├── types/             # Cross-cutting TS types
├── __tests__/         # Vitest
├── server.ts          # Public app + Socket.IO
├── internal-server.ts # Worker-only listener
└── index.ts           # Entry (instrument → startServer)
```

## Testing

Vitest in `src/__tests__/`:

```bash
cd apps/api
pnpm vitest run
pnpm vitest run src/__tests__/cache
pnpm vitest run src/__tests__/domains/matchmaking
pnpm vitest run --coverage
```

External services are mocked (Redis, Supabase, S3, Clerk). Prefer testing domain services and cache utilities; route tests live under `__tests__/routes/`.

## Extending the API

**New domain**

1. Add `domains/<name>/` with `http/`, `service/`, `types/`, `index.ts`.
2. Mount HTTP in `routes/api.ts` or `domains/admin` as appropriate.
3. Register socket handlers in `socket/index.ts` if realtime is required.
4. If multiple domains are involved, orchestrate from `contexts/`.

**New cached read**

1. Add key in `infra/redis/cache/keys.ts` and TTL in `policy.ts`.
2. Use `cache.getOrSet` in the service; `cache.invalidate` on writes.

**New worker job**

1. Define envelope in `@ws/shared-types` / `@ws/validation`.
2. Enqueue from `jobs/`; implement handler under `src/worker/` and wire `internal-worker.route.ts`.

## Related docs

- [Root README](../../README.md) — monorepo commands, Docker, worker transport
- [`CLAUDE.md`](../../CLAUDE.md) — logging format, domain boundaries, cache policy
