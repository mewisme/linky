# Linky Security Audit — Engineering Recommendations

**Document date:** 2026-05-17  
**Audit scope:** Full repository review (not limited to git diff). Runtime focus: Node.js `apps/api`, Go `apps/worker/src-go`, `apps/web`.  
**Status:** Canonical recommendations derived from the 2026-05-17 security audit.  
**How to use:** Treat each finding as a trackable work item. Fix Phase 1 items before expanding product surface area.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Repository map](#2-repository-map)
3. [Confirmed security findings — High (H1–H5)](#3-confirmed-security-findings--high-h1h5)
4. [Confirmed security findings — Medium/Low/Info (M1–M16)](#4-confirmed-security-findings--mediumlowinfo-m1m16)
5. [Recommended backend features](#5-recommended-backend-features)
6. [Recommended frontend features](#6-recommended-frontend-features)
7. [Quick wins](#7-quick-wins)
8. [Implementation roadmap](#8-implementation-roadmap)
9. [Items not verified](#9-items-not-verified)
10. [Finding index](#10-finding-index)

---

## 1. Executive summary

Linky is a Turborepo (pnpm, Node 20+) with a **production Node.js Express API**, a **Go worker** (Redis `BLPOP` → internal HTTP on a Unix socket), and a **Next.js 16** frontend (Clerk, Socket.IO, next-intl). Docker Compose runs `api` (root `Dockerfile`), `worker` (`Dockerfile.go`), `redis`, and `ollama`.

### Strengths observed in code

| Area | Evidence |
|------|----------|
| Auth | Clerk JWT on protected HTTP routes and Socket.IO namespaces; Svix-verified Clerk webhooks |
| Worker jobs | Zod `jobEnvelopeSchema` + Redis idempotency keys on internal job execution |
| Uploads | S3 presigned routes with per-user key prefix and traversal checks |
| XSS (chat) | Server-side sanitization; React text nodes for chat (no `dangerouslySetInnerHTML` in chat) |
| Observability | Sentry strips `Authorization` / `cookie`; `sendDefaultPii: false` on API |
| Health | `/healthz` liveness; `/readyz` (Redis + Supabase); graceful shutdown persists call state |
| Frontend env | Zod `.strict()` in `apps/web/src/shared/env/public-env.ts` and `server-env.ts` |

### Top risks (prioritize Phase 1)

| Priority | ID | Summary |
|----------|-----|---------|
| 1 | H1 | Internal worker API: Unix socket `chmod 0o666`, no application-layer auth |
| 2 | H2 | Jobs lost after Redis dequeue when internal API fails (no DLQ / requeue) |
| 3 | H3 | `end-call-unload` tears down rooms without ownership check when socket is gone — **fixed 2026-05-17** |
| 4 | H4 | Rate limiting skipped entirely when Redis is unavailable — **fixed 2026-05-17** |
| 5 | H5 | CORS defaults to `*` when `CORS_ORIGIN` is unset — **fixed 2026-05-17** |

Additional hardening: no `helmet`, API secrets not validated at boot, Redis without password in Compose, containers likely running as root.

**Verify current code:** All H/M findings below were re-checked against the repository on 2026-05-17 unless noted otherwise.

---

## 2. Repository map

| Area | Path(s) | Role |
|------|---------|------|
| Node.js backend (production) | `apps/api/` | Express + Socket.IO; public `:7270`; internal Unix socket or `127.0.0.1:7271` |
| Go API scaffold | `apps/api/src-go/` | Not used by production Compose `api` service |
| Go worker (production) | `apps/worker/src-go/`, `Dockerfile.go` | `BLPOP` → `POST /internal/worker/v1/jobs` |
| Node worker | `apps/worker/src/` | Same queue contract; Compose service commented out |
| Frontend | `apps/web/` | Next.js 16 App Router, Clerk, next-intl |
| Shared packages | `packages/*` | `@ws/config`, `@ws/sdk-internal`, `@ws/worker-api`, `@ws/validation`, etc. |
| Infrastructure | `Dockerfile`, `Dockerfile.go`, `docker-compose.yml`, `docker-compose.dev.yml`, `JenkinsFile`, `.github/workflows/` | Build and deploy |
| Env examples | `.env.example` (root) | `.env` is gitignored; copy from template (see M15) |

---

## 3. Confirmed security findings — High (H1–H5)

### H1 — Internal worker API: world-writable socket, no auth

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | Confirmed issue |
| **Affected files** | `apps/api/src/internal-server.ts` (lines 48–58), `packages/worker-api/src/paths.ts`, `packages/worker-api/src/headers.ts`, `docker-compose.yml` (lines 18, 34, 75, 88), `apps/api/src/routes/internal-worker.route.ts` |

**Why it matters**

The internal listener exposes `POST /internal/worker/v1/jobs` (prefix from `@ws/worker-api`). Segmentation relies on filesystem/network isolation only:

- After `listen()` on the Unix socket, the API sets **`chmodSync(..., 0o666)`**, so any UID with access to the socket path can connect.
- `buildInternalWorkerHeaders()` sends only `content-type`, optional `idempotency-key`, and `x-request-id` — **no shared secret or mTLS**.
- Compose mounts volume `backend-data:/var/run/linky` on both `api` and `worker`. Any extra process in either container (or a mis-mounted host path) can enqueue jobs that trigger Supabase/service-role side effects (`report_ai_summary`, embeddings, `apply_call_exp`, etc.).

**Concrete fix steps**

1. **Socket permissions:** Use `0o660` (or `0o600` if only one service user). Ensure API and worker share a dedicated group (e.g. `linky-internal`).
2. **Non-root containers:** Add `USER` in `Dockerfile` / `Dockerfile.go` with matching UID/GID for the socket directory (see M6).
3. **Defense in depth:** Add middleware on the internal Express app verifying `X-Worker-Secret` (or similar) with `crypto.timingSafeEqual` against `INTERNAL_WORKER_SECRET` in env; set the same secret on the Go worker HTTP client.
4. **Document** required group membership and socket path ownership in deploy runbooks.
5. **Optional:** mTLS or Unix peer credentials where supported.

**Suggested changes (verify current code)**

```ts
// apps/api/src/internal-server.ts — after successful listen
chmodSync(config.internalApiSocketPath, 0o660);
```

```ts
// New: apps/api/src/middleware/internal-worker-auth.ts
import { timingSafeEqual, createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "@/config/index.js";
import { sendJsonError } from "@/lib/http-json-response.js";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function internalWorkerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const expected = config.internalWorkerSecret;
  if (!expected) {
    sendJsonError(res, 503, "Internal auth not configured", /* userMessage */);
    return;
  }
  const provided = req.headers["x-worker-secret"];
  if (typeof provided !== "string" || !safeEqual(provided, expected)) {
    sendJsonError(res, 401, "Unauthorized", /* userMessage */);
    return;
  }
  next();
}
```

Apply before `createInternalWorkerRouter()` in `createInternalApp()`.

```go
// apps/worker/src-go — set header on internal API client
req.Header.Set("X-Worker-Secret", os.Getenv("INTERNAL_WORKER_SECRET"))
```

```yaml
# docker-compose.yml — ensure both services share group-owned socket dir
# Use entrypoint to chown /var/run/linky to linky:linky-internal before exec
```

---

### H2 — Redis jobs lost after dequeue (no DLQ / requeue)

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | Mitigated (2026-05-17) — reliable queue + DLQ shipped for Node and Go workers |
| **Affected files** | `apps/worker/src-go/internal/runtime/loop.go` (lines 22–63), `apps/worker/src-go/internal/redis/client.go` (`BLPop`, lines 79–90), `packages/sdk-internal/src/index.ts` (`enqueueJob` / `dequeueJob`, lines 8–14), `packages/shared-types/src/index.ts` (`JOB_QUEUE_KEY = "linky:queue:jobs:v2"`) |

**Why it matters**

Queue semantics are **at-most-once**:

1. Go worker `BLPOP`s from `linky:queue:jobs:v2`.
2. On success path, job is gone from Redis permanently.
3. If `api.PostEnvelope` fails after retries (`!result.OK && !result.Dropped`), the worker logs `"job not completed"` and **does not** re-enqueue or move to a DLQ.

Silent loss affects EXP application, embeddings, report AI summaries, and other background work.

**Mitigation shipped (2026-05-17)**

- Workers consume the main queue with `BLMOVE` into per-worker `linky:queue:jobs:processing:{workerId}` lists; success path `LREM`s (acks).
- Each worker refreshes `linky:worker:heartbeat:{workerId}` (TTL 30s, 10s refresh). A reaper goroutine/interval scans processing lists and `RPOPLPUSH`es items back to the main queue when the owning worker's heartbeat is missing.
- Terminal failures (4xx from internal API, retries exhausted, panics, unparseable payloads) push a `JobDlqEntry` JSON to `linky:queue:jobs:dlq:v1`.
- Implemented in both Node (`apps/worker/src/queues/run-job-loop.ts`, `heartbeat.ts`, `reaper.ts`) and Go (`apps/worker/src-go/internal/runtime/{loop,heartbeat,reaper}.go`) so the production Go path and the in-repo Node path share the contract via `@ws/sdk-internal` + `@ws/shared-types` keys.
- See [CLAUDE.md](CLAUDE.md) "Reliable queue (at-least-once)" for the canonical key list.

**Original recommendations (now superseded by mitigation, kept for context):**

1. **Short term:** On non-dropped failure, `LPUSH` the raw payload to `linky:queue:jobs:dlq:v1` with metadata (error, timestamp, label).
2. **Medium term:** Adopt **reliable queue** pattern: `BRPOPLPUSH` main → processing list; `ACK` on success; requeue from processing on timeout; visibility timeout.
3. Align Node enqueue path (`@ws/sdk-internal`) if processing list name is shared.
4. Add metrics/alerts: DLQ depth, job age, failure rate by `label`.
5. Build admin or CLI **replay** from DLQ after fixing root cause.

**Suggested changes (verify current code)**

```go
// apps/worker/src-go/internal/runtime/loop.go — after failed PostEnvelope
} else if !result.Dropped {
    if err := rdb.RequeueDLQ(ctx, raw, parsed.Label, result.LastError); err != nil {
        logger.Error("failed to move job to DLQ", "error", err)
    }
    logger.Error("job not completed", /* existing fields */)
}
```

```ts
// packages/shared-types/src/index.ts
export const JOB_DLQ_KEY = "linky:queue:jobs:dlq:v1" as const;
```

```ts
// packages/sdk-internal/src/index.ts — optional helper
export async function enqueueToDlq(client: RedisListClient, raw: string, meta: object): Promise<void> {
  await client.lPush(JOB_DLQ_KEY, JSON.stringify({ raw, meta, at: new Date().toISOString() }));
}
```

---

### H3 — `end-call-unload`: room teardown without socket ownership when socket missing

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/api/src/domains/video-chat/http/end-call-unload.route.ts`, `apps/api/src/domains/video-chat/types/room.types.ts`, `apps/api/src/domains/video-chat/service/rooms.service.ts`, `apps/api/src/domains/video-chat/socket/types.ts`, `apps/api/src/domains/video-chat/socket/matchmaking.socket.ts`, `apps/api/src/__tests__/domains/video-chat/end-call-unload.route.test.ts` |

**Resolution**

`VideoChatRoomRecord` now carries `user1ClerkId` / `user2ClerkId`, populated at `RoomService.createRoom` time from the matchmaking handler (stable across socket-id rotations done by `updateSocketId`). The `end-call-unload` handler enforces `callerOwnsSocketInRoom(room, socketId, callerClerkId)` **before** any teardown in the socket-missing branch, returning `403` when the caller is not the participant whose `socketId` is being unloaded. The socket-present branch retains its existing ownership check on `socket.data.userId`. Three regression tests cover offline-attacker, offline-owner, and online-attacker cases.

**Why it matters**

When `io.sockets.get(socketId)` is **undefined**, the handler still:

- Loads the room via `rooms.getRoomByUser(socketId)`
- Records call history, notifies peer, deletes the room

The **ownership check** (`clerkUserId !== callerClerkId`) runs only when the socket is online (lines 89–104). An authenticated attacker who knows or guesses another user’s `socketId` can disrupt active calls. Rate limit (5 req / 10s) only slows abuse.

**Concrete fix steps**

1. Persist **Clerk user IDs** on the room at creation (extend `VideoChatRoomRecord` with `user1ClerkId` / `user2ClerkId` or map socket → clerk at `createRoom`).
2. Before any teardown (including socket-missing branch), require `callerClerkId` matches one of the room participants.
3. Reject with `403` if `socketId` is not a participant in the room.
4. Add integration test: authenticated user A cannot unload user B’s `socketId`.
5. Keep rate limit; consider binding unload token to `socketId` (see M16).

**Suggested changes (verify current code)**

```ts
// apps/api/src/domains/video-chat/types/room.types.ts
export interface VideoChatRoomRecord extends VideoChatRoom {
  // ...existing fields...
  user1ClerkId?: string;
  user2ClerkId?: string;
}
```

```ts
// apps/api/src/domains/video-chat/http/end-call-unload.route.ts
// Before room cleanup in BOTH branches (socket missing and present):
function assertCallerOwnsSocket(
  room: VideoChatRoomRecord,
  socketId: string,
  callerClerkId: string,
): boolean {
  const ownsSocket =
    (room.user1 === socketId && room.user1ClerkId === callerClerkId) ||
    (room.user2 === socketId && room.user2ClerkId === callerClerkId);
  return ownsSocket;
}

// In `if (!socket) {` block, before `if (room) {`:
if (room && !assertCallerOwnsSocket(room, socketId, callerClerkId)) {
  return sendJsonError(res, 403, "Forbidden", /* ... */);
}
```

Populate `user1ClerkId` / `user2ClerkId` in `RoomService.createRoom` from `AuthenticatedSocket.data.userId`.

---

### H4 — Rate limiting disabled when Redis is down

| Field | Value |
|-------|-------|
| **Severity** | High (availability / abuse) |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/api/src/middleware/rate-limit.ts`, `apps/api/src/routes/webhook.ts`, `apps/api/src/domains/reports/http/reports.route.ts`, `apps/api/src/domains/reports/http/admin-reports.route.ts`, `apps/api/src/domains/admin/index.ts`, `apps/api/src/domains/admin/http/broadcasts.route.ts`, `apps/api/src/domains/video-chat/http/end-call-unload.route.ts`, `apps/api/src/__tests__/middleware/rate-limit.test.ts` |

**Resolution**

`createRateLimitMiddleware` now accepts a `failClosed` flag. When set, both the Redis-disconnected branch and the `withRedisTimeout` catch branch respond with `503 Service Unavailable` (`code: "RATE_LIMIT_UNAVAILABLE"`, `userMessage` key `api.serviceUnavailable`) instead of silently calling `next()`. A new `rateLimitMiddlewareFailClosed` export wraps the default config with `failClosed: true`. Tier A routes were converted: Clerk webhook (`/webhook/clerk`), user reports `POST /reports`, the entire admin router mount (`/api/v1/admin/*`), broadcast AI generate, admin report AI summary, and `end-call-unload`. Tier B routes (favorites, queue-status) keep the legacy fail-open behavior. Seven regression tests cover both modes (open: 200 on Redis down/throw, 429 over limit; closed: 503 on Redis down/throw, 429 over limit).

**Why it matters**

- If `!redisClient.isOpen`, middleware logs a warning and calls **`next()`** with no limit.
- On Redis errors in `withRedisTimeout`, catch block also calls **`next()`**.

During Redis outages, webhooks, reports, favorites, admin routes, and `end-call-unload` become unbounded.

**Concrete fix steps**

1. Define **tier A** routes (webhook, auth-adjacent, reports, admin mutations, unload): **fail closed** → `503` when Redis unavailable.
2. Define **tier B** routes: optional in-memory fallback (`rate-limiter-flexible` `MemoryStore`) with conservative per-IP limits.
3. Never silently skip limits on tier A.
4. Alert on rate-limit Redis errors (Sentry/metrics).
5. Document operational tradeoff in runbooks.

**Suggested changes (verify current code)**

```ts
// apps/api/src/middleware/rate-limit.ts
export function createRateLimitMiddleware(options?: {
  windowMs?: number;
  maxRequests?: number;
  failClosed?: boolean;
}) {
  const failClosed = options?.failClosed ?? false;
  // ...
  if (!redisClient.isOpen) {
    if (failClosed) {
      sendJsonError(res, 503, "Service Unavailable", um(/* ... */));
      return;
    }
    logger.warn("Redis not available, skipping rate limit");
    return next();
  }
  // In catch:
  if (failClosed) {
    sendJsonError(res, 503, "Service Unavailable", um(/* ... */));
    return;
  }
  next();
}
```

```ts
// apps/api/src/domains/video-chat/http/end-call-unload.route.ts
const unloadRateLimit = createRateLimitMiddleware({
  windowMs: 10_000,
  maxRequests: 5,
  failClosed: true,
});
```

Apply `failClosed: true` to webhook and sensitive admin routers similarly.

---

### H5 — CORS defaults to allow-all

| Field | Value |
|-------|-------|
| **Severity** | High (when `CORS_ORIGIN` unset in production) |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/api/src/utils/cors.ts`, `apps/api/src/config/index.ts`, `apps/api/src-go/internal/config/config.go`, `apps/api/src/__tests__/utils/cors.test.ts`, `apps/api/src-go/internal/config/config_test.go` |

**Resolution**

`parseCorsOriginStrict(envValue, nodeEnv)` now wraps `parseCorsOrigin`. In production it throws when `CORS_ORIGIN` is unset, the wildcard `*` / `wildcard`, or an empty allowlist (including bracketed `[]`); in development/test it preserves the previous permissive behavior. The API config calls the strict variant once, and the same `config.corsOrigin` value is reused by both Express CORS (`apps/api/src/middleware/index.ts`) and Socket.IO CORS (`apps/api/src/socket/index.ts`), so a single enforcement point covers both transports. The Go API mirrors the helper in `apps/api/src-go/internal/config/config.go` and `panic`s at boot when production validation fails. Unit tests cover wildcard, unset, bracketed empty, and explicit allowlist inputs in both runtimes.

**Why it mattered**

`parseCorsOrigin(undefined)` returned `"*"`. Express and Socket.IO both used `config.corsOrigin` with **`credentials: true`**. Browsers reject credentialed requests with `Origin: *` in many cases, but misconfiguration still risked accidental open CORS in staging or mis-set production env.

**Concrete fix steps (applied)**

1. At startup, if `nodeEnv === 'production'`, require explicit `CORS_ORIGIN` (comma-separated allowlist or single origin).
2. Reject `*` / `wildcard` / empty allowlist in production with a clear error (TS throws → process exits via uncaught error; Go `panic`s in `Load()`).
3. Mirror validation for Socket.IO CORS config — both share the same parsed value.
4. Document required values per environment in `.env.example` (M15, fixed 2026-05-17).

**Applied changes**

```ts
// apps/api/src/utils/cors.ts
export function parseCorsOriginStrict(
  envValue: string | undefined,
  nodeEnv: string,
): string | string[] {
  const origin = parseCorsOrigin(envValue);
  if (nodeEnv !== "production") return origin;

  const isWildcard = origin === "*";
  const isEmptyArray = Array.isArray(origin) && origin.length === 0;
  if (isWildcard || isEmptyArray) {
    throw new Error(
      "CORS_ORIGIN must be set to an explicit allowlist in production (wildcard '*' is not allowed)",
    );
  }
  return origin;
}
```

```ts
// apps/api/src/config/index.ts
const nodeEnv = process.env.NODE_ENV || "development";
export const config = {
  // ...
  nodeEnv,
  corsOrigin: parseCorsOriginStrict(process.env.CORS_ORIGIN, nodeEnv),
  // ...
} as const;
```

```go
// apps/api/src-go/internal/config/config.go
nodeEnv := envStr("NODE_ENV", "development")
corsOrigin, err := parseCorsOriginStrict(os.Getenv("CORS_ORIGIN"), nodeEnv)
if err != nil {
    panic(err)
}
```

---

## 4. Confirmed security findings — Medium/Low/Info (M1–M16)

### M1 — No HTTP security headers (`helmet`)

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | Confirmed issue |
| **Affected files** | `apps/api/src/middleware/index.ts` |

**Why it matters**

Missing `X-Content-Type-Options`, `X-Frame-Options`, HSTS (behind TLS), and baseline CSP hardening for JSON APIs reduces defense-in-depth against certain client-side attacks and misconfigured proxies.

**Fix steps**

1. Add `helmet` to `apps/api` dependencies.
2. Call `app.use(helmet({ /* production HSTS when behind TLS */ }))` early in `setupMiddleware`, after `trust proxy`.
3. Tune `crossOriginResourcePolicy` if needed for known frontends.

**Snippet**

```ts
import helmet from "helmet";

export function setupMiddleware(app: Express): void {
  app.enable("trust proxy");
  app.use(helmet());
  // ...existing middleware
}
```

---

### M2 — API secrets not validated at startup

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/api/src/config/schema.ts`, `apps/api/src/config/index.ts`, `apps/api/src/__tests__/config/schema.test.ts` |

**Resolution**

`apps/api/src/config/schema.ts` defines a Zod `.strict()` schema for all API secrets and integration URLs previously cast with `as string` in `config/index.ts` (Clerk, Supabase, Redis, S3, Cloudflare TURN, Ollama, VAPID, plus typed optional tunables). `parseApiEnv()` runs once at module load after dotenv; on `ZodError` it prints field-level issues and `process.exit(1)`. `NODE_ENV=test` fills documented placeholder defaults so Vitest can import modules that transitively load config (e.g. cache namespace) without a full `.env`. Production CORS allowlist enforcement remains in `parseCorsOriginStrict()` (H5), with boot failure via `process.exit(1)` on throw. Five unit tests cover valid config, missing secrets, invalid URLs, unknown keys, and test defaults.

**Why it mattered**

Missing `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, etc. surfaced as runtime 500s or confusing partial failures instead of fail-fast at boot.

**Fix steps (applied)**

1. Added `apps/api/src/config/schema.ts` with Zod `.strict()` for required variables.
2. Parse once at module load; `process.exit(1)` on failure with field-level errors.
3. Aligned with explicit `pickApiEnv` + `parse()` pattern used in `@ws/worker-api` and web `server-env.ts`.
4. Cross-check against `.env.example` (M15, fixed 2026-05-17).

---

### M3 — 500 responses may leak internal error text

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/api/src/lib/api-user-message.ts`, `apps/api/src/middleware/index.ts`, `apps/api/src/internal-server.ts`, `apps/api/src/__tests__/lib/api-user-message.test.ts` |

**Resolution**

`unexpectedServerUserMessage(errorDetail, nodeEnv)` returns a generic `UNEXPECTED_SERVER` / `internalServerError` payload in production and `umDetail` with the underlying message in `development` / `test`. Both the public Express error handler (`setupErrorHandlers`) and the internal worker listener (`createInternalApp`) use this helper; full errors remain in server logs via `logger.error(logErr, ...)`.

**Why it mattered**

`umDetail("UNEXPECTED_SERVER", logErr.message)` could expose database, Redis, or filesystem error strings to API clients.

---

### M4 — JSON body size limit bypass without `Content-Length`

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/api/src/middleware/index.ts`, `apps/api/src/internal-server.ts`, `apps/api/src/lib/http-payload-too-large-error.ts`, `apps/api/src/__tests__/lib/http-payload-too-large-error.test.ts` (removed `apps/api/src/middleware/json-body-size-limit.ts`) |

**Resolution**

Removed the redundant `Content-Length` pre-check middleware that skipped requests without `Content-Length`. Public and internal listeners now rely on `express.json({ limit: config.jsonBodySizeLimit })` as the single enforcement point (body-parser streams with a hard cap regardless of `Content-Length`). Global error handlers map `entity.too.large` / HTTP 413 to the existing `PAYLOAD_TOO_LARGE` / `payloadTooLarge` response via `isPayloadTooLargeError` / `sendPayloadTooLargeError`.

**Why it matters**

Early reject runs only when `content-length` is present. Requests without `Content-Length` skip the pre-check; `express.json({ limit: config.jsonBodySizeLimit })` still enforces eventually but may read further into the body first.

**Fix steps**

1. Rely solely on `express.json` limit for JSON routes and remove redundant pre-middleware, **or**
2. Reject `POST`/`PUT`/`PATCH` with `application/json` and missing `Content-Length` above a threshold, **or**
3. Use `express.raw` + manual parse with hard cap for sensitive routes.

**Snippet**

```ts
if (!contentLength && ["POST", "PUT", "PATCH"].includes(req.method)) {
  sendJsonError(res, 411, "Length Required", um(/* ... */));
  return;
}
```

(Only if product clients always send `Content-Length`; otherwise prefer tightening `express.json` only.)

---

### M5 — Redis without authentication in Compose

| Field | Value |
|-------|-------|
| **Severity** | Medium (defense in depth) |
| **Status** | Confirmed issue |
| **Affected files** | `docker-compose.yml` (`redis` service, lines 92–105), `docker-compose.dev.yml` |

**Why it matters**

No `requirepass` or ACL. Any compromised container on `linky-network` gets full Redis access (rate limits, idempotency keys, cache).

**Fix steps**

1. Set `command: redis-server --requirepass ${REDIS_PASSWORD}` (or ACL file).
2. Update `REDIS_URL` to `redis://:${REDIS_PASSWORD}@redis:6379` for `api` and `worker`.
3. Do not publish Redis port to host in production compose.
4. Rotate password via secrets manager.

---

### M6 — Containers likely run as root

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | Confirmed issue |
| **Affected files** | `Dockerfile`, `Dockerfile.go` (no `USER` directive; only `chmod` on entrypoints) |

**Why it matters**

Root in container increases impact of RCE and complicates secure Unix socket ownership (H1).

**Fix steps**

1. `addgroup` / `adduser` in runtime stage; `USER linky`.
2. `chown` `/var/run/linky` to `linky:linky-internal` in entrypoint before dropping privileges.
3. Consider `read_only: true` root filesystem + `tmpfs` for writable dirs where compatible.

---

### M7 — Clerk user ID logged at INFO on every authenticated request

| Field | Value |
|-------|-------|
| **Severity** | Medium (PII / log volume) |
| **Status** | Confirmed issue |
| **Affected files** | `apps/api/src/middleware/clerk.ts` (line 22) |

**Why it matters**

Every authenticated request logs `payload.sub` at INFO — high volume and PII in centralized logs.

**Fix steps**

1. Change to `logger.debug` or remove.
2. If needed for audit, log hashed subject or sample at low rate.

**Snippet**

```ts
logger.debug("Clerk token verified");
// Avoid logging payload.sub at info in production
```

---

### M8 — Morgan access logs in production

| Field | Value |
|-------|-------|
| **Severity** | Low–Medium |
| **Status** | Confirmed issue |
| **Affected files** | `apps/api/src/middleware/index.ts` (lines 21–67) |

**Why it matters**

Production format logs full URL, referrer, and user-agent. Future query tokens in URLs would leak.

**Fix steps**

1. Disable Morgan in production; use structured request logging with route template (not raw URL).
2. Redact known sensitive query params.

---

### M9 — Root `GET /` exposes `environment`

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/api/src/routes/index.ts`, `apps/api/src-go/internal/routes/health.go` |

**Resolution**

Public `GET /` now returns only `{ "status": "running" }` (no `environment` or `timestamp`) on both the Express and Go API listeners.

**Why it mattered**

Revealed `config.nodeEnv` to unauthenticated callers — minor information disclosure.

---

### M10 — Go worker: no panic recovery in job loop

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/worker/src-go/internal/runtime/loop.go`, `apps/worker/src-go/internal/runtime/loop_test.go` |

**Resolution**

`processOnce` recovers panics per iteration, logs panic + stack, and when a dequeued payload is in scope pushes a `reason=panic` DLQ entry and acks (matching the Node worker). `RunJobLoop` exits after five consecutive job panics so the orchestrator can restart a wedged worker.

**Why it matters**

Unhandled panic in job handling crashes the process; in-flight job is lost (compounds H2).

**Fix steps**

1. Wrap each iteration with `defer recover()`.
2. Log panic + stack; push raw payload to DLQ if possible.
3. Continue loop unless repeated panics exceed threshold (then exit for orchestrator restart).

**Snippet**

```go
func RunJobLoop(/* ... */) {
  for !stopping.Load() {
    func() {
      defer func() {
        if r := recover(); r != nil {
          logger.Error("panic in job loop", "panic", r, "stack", string(debug.Stack()))
        }
      }()
      // existing dequeue + process body
    }()
  }
}
```

---

### M11 — Go worker: `REDIS_URL` not required in config

| Field | Value |
|-------|-------|
| **Severity** | Low–Medium |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/worker/src-go/internal/config/config.go`, `apps/worker/src-go/internal/config/config_test.go` |

**Resolution**

`config.Parse()` now returns an error when `NODE_ENV=production` and `REDIS_URL` is empty, so the worker fails fast at startup instead of falling back to `localhost:6379` in `buildOptions`. Development may still omit `REDIS_URL` for local Redis defaults.

**Why it mattered**

Empty `REDIS_URL` fell back to `localhost:6379`. In Docker, misconfiguration could connect to the wrong host silently or fail unpredictably.

---

### M12 — `requireAdmin` is a no-op

| Field | Value |
|-------|-------|
| **Severity** | Info |
| **Status** | Confirmed issue (misleading API) |
| **Affected files** | `apps/api/src/lib/auth/role-guard.ts` (lines 6–8) |

**Why it matters**

`requireAdmin` calls `next()` unconditionally. Real protection is `adminMiddleware` on `/api/v1/admin` mount. Developers may mistakenly use `requireAdmin` on new routes thinking it enforces role.

**Fix steps**

1. Implement `requireAdmin` using `getAdminRole` (admin or superadmin), or remove export and replace usages.
2. Add ESLint rule or codemod to ban empty guards.

**Note:** `requireSuperAdmin` is correctly implemented (lines 10–30).

---

### M13 — Frontend: permissive `images.remotePatterns`

| Field | Value |
|-------|-------|
| **Severity** | Low–Medium |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `apps/web/next.config.ts`, `apps/web/src/shared/config/remote-image-hosts.ts`, `apps/web/src/features/chat/ui/chat-message-bubble.tsx`, `apps/web/src/features/chat/ui/giphy.tsx` |

**Resolution**

Replaced wildcard `hostname: "**"` (http and https) with an HTTPS-only allowlist shared via `remote-image-hosts.ts`: Clerk (`img.clerk.com`, `images.clerk.dev`), S3 (`*.amazonaws.com`), CloudFront (`*.cloudfront.net`), Supabase storage (`*.supabase.co`), and Giphy CDN (`*.giphy.com`). `isAllowedRemoteImageSrc()` permits local paths and `data:` inline attachments; chat message bubbles and the Giphy picker skip rendering when a remote `src` is not on the allowlist, so the Next.js image optimizer cannot be used as an open proxy for arbitrary URLs.

**Why it mattered**

`hostname: "**"` for http and https allowed Next.js image optimizer to fetch arbitrary URLs if user-controlled src slipped through — SSRF/open-proxy style risk.

**Fix steps (applied)**

1. Allowlisted Clerk, S3/CDN, Giphy, and known avatar hosts only.
2. Reject disallowed remote URLs in `next/image` chat components at render time.

---

### M14 — `/test(.*)` public in Clerk proxy

| Field | Value |
|-------|-------|
| **Severity** | Low (if test routes ship in production builds) |
| **Status** | Confirmed issue |
| **Affected files** | `apps/web/src/proxy.ts` (line 25) |

**Why it matters**

`isPublicRoute` includes `/test(.*)` — any test-only pages under `/test` skip `auth.protect()` in production.

**Fix steps**

1. Gate with `process.env.NODE_ENV === 'development'` or remove from matcher in production builds.
2. Ensure no sensitive routes live under `/test` in prod bundles.

---

### M15 — No repository `.env.example`

| Field | Value |
|-------|-------|
| **Severity** | Info (operations) |
| **Status** | **Fixed** (2026-05-17) |
| **Affected files** | `.env.example` (repository root); cross-check with `apps/api/src/config/schema.ts`, `apps/web/src/shared/env/` |

**Resolution**

Added root `.env.example` documenting required and optional variables for API (`apiEnvSchema`), web (`public-env.ts`, `server-env.ts`), Clerk, worker internal API transport, and optional observability/E2E keys. Sections separate required core keys, web-only keys, API tunables, worker settings, and production-only notes (e.g. `CORS_ORIGIN`). Placeholders use safe dummy values; README already points developers to copy root `.env` for local setup.

**Why it mattered**

Onboarding and secure defaults were harder to verify; auditors could not confirm documented required vars from the repo alone.

**Fix steps (applied)**

1. Added `.env.example` with every required key, safe placeholders, and comments.
2. Split optional vs required per environment (dev vs prod) in section headers.
3. Aligned keys with Zod-validated API and web env modules (M2 cross-check).

---

### M16 — `sendBeacon` unload path may lack reliable backend auth

| Field | Value |
|-------|-------|
| **Severity** | Medium (conditional / reliability) |
| **Status** | Confirmed issue |
| **Affected files** | `apps/web/src/features/call/hooks/webrtc/use-unload-end-call.ts`, `apps/web/src/app/api/video-chat/end-call-unload/route.ts` |

**Why it matters**

`navigator.sendBeacon` cannot set `Authorization`. The Next.js route tries Clerk `auth({ acceptsToken: "any" })` and session cookies. If cookies are not sent on unload, the proxy may call the API without a token (401) — unreliable cleanup, not necessarily auth bypass. SameSite / Secure cookie policy matters.

**Fix steps**

1. Document SameSite=`Lax` or `None; Secure` requirements for unload.
2. Issue short-lived **unload token** bound to `socketId` + `userId` when call starts; accept token on unload route as alternative to Bearer.
3. Fix H3 so even cookie-less edge cases cannot tear down another user’s room.

---

## 5. Recommended backend features

Each item includes description, rationale, implementation approach, and priority.

| # | Feature | Description | Rationale | Implementation approach | Priority |
|---|---------|-------------|-----------|-------------------------|----------|
| 1 | Internal API auth | Shared secret or mTLS on `/internal/worker/v1/*` | Closes H1 gap if socket is misconfigured | Middleware + env `INTERNAL_WORKER_SECRET`; Go client header; rotate via secrets manager | **P1** |
| 2 | DLQ + queue metrics | Dead-letter list, depth/age metrics, replay tool | Prevents silent job loss (H2); ops visibility | `linky:queue:jobs:dlq:v1`; Prometheus counters or Sentry metrics; admin-only replay endpoint | **P1** |
| 3 | Tiered rate limits | Per-IP anonymous, per-user authenticated, stricter admin | Abuse prevention beyond flat middleware | Extend `createRateLimitMiddleware` with key strategies; document tiers in config | **P2** |
| 4 | Fail-closed rate limit | No unlimited traffic when Redis down | Addresses H4 | `failClosed` flag per router; 503 for tier A | **P1** |
| 5 | Audit log | Immutable log of admin mutations | Compliance, incident response | New table `admin_audit_events`; middleware on admin write routes; clerk user id + payload hash | **P2** |
| 6 | Abuse signals | Report velocity, block graph, matchmaking abuse | Proactive moderation | Redis counters + worker jobs to flag users; tie into reports domain | **P2** |
| 7 | Readiness in Compose | Use `/readyz` for `depends_on` | Avoid routing traffic before DB/Redis ready | Change healthcheck URL; worker waits for api ready | **P2** |
| 8 | Worker health endpoint | HTTP `:8081/healthz` on Go worker | Orchestrator can restart unhealthy workers | Minimal mux in worker main; optional Docker HEALTHCHECK | **P2** |
| 9 | API versioning policy | Document `/api/v1` stability | Client expectations | `docs/api-versioning.md` + deprecation headers | **P3** |
| 10 | Startup env schema | Fail fast on misconfiguration | Addresses M2 | Zod strict parse in `apps/api/src/config` | **P1** |

---

## 6. Recommended frontend features

| # | Feature | Description | Rationale | Implementation approach | Priority |
|---|---------|-------------|-----------|-------------------------|----------|
| 1 | Connection status UX | Surface Socket.IO / MQTT degraded state on call page | Users understand match/call failures | Zustand slice from existing health hooks; banner + i18n strings | **P2** |
| 2 | Reporting / blocking UX | Post-call report CTA, blocked-user feedback | Safety and trust | Call end modal; wire to reports API; toasts with `useTranslations` | **P2** |
| 3 | Moderation admin UI | Report queue with AI summary preview | Ops efficiency | Admin feature module; DataTable + `useXxxColumns` pattern | **P2** |
| 4 | Onboarding | Camera/mic permissions, safety tips | Reduce bounce / policy issues | `(app)` onboarding route; Clerk-gated | **P3** |
| 5 | Privacy controls | Export/delete aligned with Clerk webhooks | GDPR-style expectations | Settings page + server actions via `serverFetch` | **P3** |
| 6 | Empty/error/loading polish | Skeletons on call history, favorites | UX quality | Server component + `-client.tsx` skeletons; error boundaries | **P3** |
| 7 | Accessibility pass | Focus traps, live regions for match found | a11y compliance | Audit Radix dialogs; `aria-live` on match state | **P2** |
| 8 | SEO / OG | Locale-aware OG images | Marketing conversion | Extend `(marketing)` `generateMetadata`; `/og` routes | **P3** |
| 9 | CSP + image allowlist | Strict CSP and tightened `remotePatterns` | Addresses M13 | `next.config.ts` headers; allowlist hostnames | **P2** |
| 10 | Analytics funnel | Sign-up → first call | Product insight | OpenPanel events (already wired); define funnel schema | **P3** |

---

## 7. Quick wins

Ordered by **impact** (high first). Effort: **S** = hours, **M** = 1–2 days, **L** = multi-day.

| Order | Item | Finding | Impact | Effort |
|-------|------|---------|--------|--------|
| 1 | ~~Fix `end-call-unload` ownership when socket absent~~ (fixed 2026-05-17) | H3 | Stops call disruption abuse | M |
| 2 | `chmod 0o660` internal socket + shared group | H1 | Reduces local privilege abuse | S |
| 3 | DLQ `LPUSH` on worker HTTP failure | H2 | Stops silent job loss | M |
| 4 | ~~Fail-closed rate limit on webhooks/reports/unload~~ (fixed 2026-05-17) | H4 | Abuse resistance during Redis outage | S |
| 5 | ~~Require `CORS_ORIGIN` in production~~ (fixed 2026-05-17) | H5 | Prevents accidental open CORS | S |
| 6 | Add `helmet` to Express | M1 | Baseline HTTP hardening | S |
| 7 | Zod-validated API env at boot | M2 | Fail-fast deploys | M |
| 8 | Redis `requirepass` in Compose | M5 | Defense in depth | S |
| 9 | Clerk auth log → `debug` | M7 | PII/log volume | S |
| 10 | ~~Add `.env.example`~~ (fixed 2026-05-17) | M15 | Onboarding + secure defaults | S |

---

## 8. Implementation roadmap

### Phase 1 — Urgent security and reliability (1–2 weeks)

| Task | Findings | Owner hint | Status |
|------|----------|------------|--------|
| `end-call-unload` authorization (room clerk IDs) | H3 | API + video-chat domain | Pending |
| Socket `0o660` + non-root + optional `INTERNAL_WORKER_SECRET` | H1, M6 | API, worker, Docker | Pending |
| DLQ + requeue on worker failure | H2 | Go worker, `sdk-internal` | Done (2026-05-17) |
| Fail-closed rate limit (tier A routes) | H4 | API middleware | Done (2026-05-17) |
| Production `CORS_ORIGIN` enforcement | H5 | API config | Done (2026-05-17) |
| Zod env validation at boot | M2 | API config | Pending |
| Sanitize 500 `userMessage` in production | M3 | API middleware | Pending |

**Exit criteria:** No High finding unmitigated; DLQ depth alert wired; manual test for unload ownership.

### Phase 2 — Maintainability and observability (2–4 weeks)

| Task | Findings |
|------|----------|
| `helmet`, Redis auth, non-root Docker users | M1, M5, M6 |
| `/readyz` in Compose; worker healthcheck | Ops |
| Queue metrics + alerting | H2 |
| Admin audit logging | Feature #5 |
| `pnpm audit` remediation (`xlsx`, `path-to-regexp`, `vite` dev deps) | Supply chain |
| Panic recovery in Go worker loop | M10 (fixed 2026-05-17) |
| Tiered rate limits | Feature #3 |
| Morgan → structured logging in prod | M8 |

**Exit criteria:** Staging deploy passes health/readiness gates; DLQ replay documented.

### Phase 3 — Product and polish (ongoing)

| Task | Notes |
|------|-------|
| Moderation pipeline UI + admin tooling | Frontend #3 |
| Abuse prevention tiers + connection-status UX | Backend #6, Frontend #1 |
| Onboarding, privacy center, SEO/OG | Frontend #4, #5, #8 |
| API versioning policy + ops runbooks | Backend #9, M15 |

---

## 9. Items not verified

The following require **runtime, deployment, or dashboard access** and were **not** confirmed from repository code alone:

| Item | Why unverified |
|------|----------------|
| TLS termination and HSTS at edge | Load balancer / CDN config not in repo |
| WAF rules | External to codebase |
| Supabase Row Level Security policies | Database console / migrations may not reflect production |
| Clerk dashboard settings | Session lifetime, MFA, allowed origins |
| Host firewall / bind address for published ports | `docker-compose.yml` uses `${PORT:-7270}` on all interfaces unless overridden at deploy time |
| Production value of `CORS_ORIGIN` | Env file gitignored |
| Contents of live `.env` on servers | Gitignored; presence locally not audited |
| Whether `/test` routes exist in production bundles | Build/deploy specific |
| Actual Redis password in running clusters | Compose sample has no password (M5) |
| Penetration test / dynamic scan results | Not in scope of static audit |

**Action:** Verify each item in staging/production checklists before claiming audit closure.

---

## 10. Finding index

| ID | Severity | Title | Section |
|----|----------|-------|---------|
| H1 | High | Internal worker API: world-writable socket, no auth | [H1](#h1--internal-worker-api-world-writable-socket-no-auth) |
| H2 | High | Redis jobs lost after dequeue (mitigated 2026-05-17) | [H2](#h2--redis-jobs-lost-after-dequeue-no-dlq--requeue) |
| H3 | High | `end-call-unload` without ownership when socket missing — **fixed** | [H3](#h3--end-call-unload-room-teardown-without-socket-ownership-when-socket-missing) |
| H4 | High | Rate limiting fails open when Redis down — **fixed** | [H4](#h4--rate-limiting-disabled-when-redis-is-down) |
| H5 | High | CORS defaults to `*` — **fixed** | [H5](#h5--cors-defaults-to-allow-all) |
| M1 | Medium | No `helmet` | [M1](#m1--no-http-security-headers-helmet) |
| M2 | Medium | API secrets not validated at startup — **fixed** | [M2](#m2--api-secrets-not-validated-at-startup) |
| M3 | Medium | 500 responses leak error text | [M3](#m3--500-responses-may-leak-internal-error-text) |
| M4 | Medium | JSON size pre-check without Content-Length | [M4](#m4--json-body-size-limit-bypass-without-content-length) |
| M5 | Medium | Redis without auth in Compose | [M5](#m5--redis-without-authentication-in-compose) |
| M6 | Medium | Containers run as root | [M6](#m6--containers-likely-run-as-root) |
| M7 | Medium | Clerk sub logged at INFO | [M7](#m7--clerk-user-id-logged-at-info-on-every-authenticated-request) |
| M8 | Low–Medium | Morgan access logs in production | [M8](#m8--morgan-access-logs-in-production) |
| M9 | Low | Root exposes environment — **fixed** | [M9](#m9--root-get--exposes-environment) |
| M10 | Medium | No panic recovery in Go worker | [M10](#m10--go-worker-no-panic-recovery-in-job-loop) |
| M11 | Low–Medium | `REDIS_URL` not required (Go) — **fixed** | [M11](#m11--go-worker-redis_url-not-required-in-config) |
| M12 | Info | `requireAdmin` no-op | [M12](#m12--requireadmin-is-a-no-op) |
| M13 | Low–Medium | Permissive image remotePatterns — **fixed** | [M13](#m13--frontend-permissive-imagesremotepatterns) |
| M14 | Low | `/test` public in proxy | [M14](#m14--test-public-in-clerk-proxy) |
| M15 | Info | No `.env.example` — **fixed** | [M15](#m15--no-repository-envexample) |
| M16 | Medium | sendBeacon unload auth reliability | [M16](#m16--sendbeacon-unload-path-may-lack-reliable-backend-auth) |

**Confirmed issues:** H1–H5, M1–M3, M5–M8, M12, M14, M16 (evidence in cited files as of 2026-05-17). **Fixed:** M4, M9, M10, M11, M13, M15 (2026-05-17).  
**Recommendations (not vulnerabilities):** Sections 5–6, Phase 3 roadmap items.

---

*End of document.*
