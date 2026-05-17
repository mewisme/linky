# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linky is a real-time video chat platform. Turborepo monorepo with pnpm 11.1+ (pinned via `packageManager` in root `package.json`) and Node.js 20+. `zod` is pinned to `4.3.6` via `pnpm.overrides` — don't bump it without a coordinated change.

## Common Commands

```bash
# Development
pnpm dev                  # All apps (turbo)
pnpm dev:api              # API only (Express; default PORT 7270, override via env)
pnpm dev:web              # Frontend only (Next.js, port 3000)
pnpm dev:worker           # Node.js worker (AI + general Redis queues; calls internal HTTP API)
pnpm dev:worker-go        # Go worker (production worker; same queues + internal API contract)

# Build
pnpm build                # All packages
pnpm build:api            # API only
pnpm build:web            # Web only
pnpm start:api            # Production API (after build)
pnpm start:web            # Production web (after build)
pnpm start:worker         # Production Node.js worker (after build)
pnpm build:api-go         # Build Go API binary scaffold (apps/api/bin/api)
pnpm build:worker-go      # Build Go worker binary (apps/worker/bin/worker)

# Lint & Type Check
pnpm lint                 # ESLint all
pnpm lint:api             # ESLint API
pnpm lint:web             # ESLint web
pnpm check-types          # TypeScript all workspaces
pnpm check-types:api      # API only
pnpm check-types:web      # Web only
pnpm format               # Prettier

# Testing - Backend Unit (Vitest)
cd apps/api
pnpm vitest run                            # All unit tests
pnpm vitest run src/__tests__/cache        # Test directory
pnpm vitest run src/__tests__/domains/user.test.ts  # Single file
pnpm vitest run -t "should cache user"     # Filter by test name (regex)

# Testing - E2E (Playwright, from root)
pnpm test                 # All e2e tests
pnpm test:ui              # Playwright UI mode
pnpm test:debug           # Debug mode
pnpm test:trace           # With trace
pnpm test:report          # View HTML report

# Run a single E2E test file
pnpm exec playwright test tests/user-profile.spec.ts

# Run a specific test by title (regex)
pnpm exec playwright test -g "should update avatar"

# Single-package Turbo runs (handy when iterating on a shared package)
pnpm exec turbo run check-types --filter=@ws/ui
pnpm exec turbo run lint --filter=@ws/shared-types

# Versioning: bumps versions and regenerates CHANGELOG.md
pnpm upver
```

## Monorepo Structure

```
apps/
  api/           Express backend (DDD, `src/`) + Go scaffold (`src-go/`); enqueues work to Redis queues
  web/           Next.js 16 frontend (App Router)
  worker/        Node worker (`src/`) and Go worker (`src-go/`); Redis queues + internal API. Go is production in docker-compose (Dockerfile.go); Node via root Dockerfile entrypoint worker.
packages/
  config/             Shared env parsing (Zod); @ws/config
  database-types/     Supabase-oriented DB types; @ws/database-types
  eslint-config/      Shared ESLint configs
  logger/             Pino bootstrap; @ws/logger
  sdk-internal/       Redis queue enqueue/dequeue helpers; @ws/sdk-internal
  shared-types/       Cross-app queue keys and job envelope types; @ws/shared-types
  typescript-config/  Shared TS configs
  ui/                 Shared React library (Radix + shadcn); @ws/ui
  validation/         Shared Zod schemas for job envelopes; @ws/validation
  worker-api/           Worker internal HTTP paths, env parsing, idempotency headers; @ws/worker-api
```

**Queue contracts:** payload shapes and keys live in `@ws/shared-types` and `@ws/validation`. The API enqueues via `apps/api/src/jobs/` and Redis; the worker uses `@ws/sdk-internal` to dequeue and calls authenticated internal routes under `/internal/worker/v1` on `apps/api` to execute jobs (no direct imports from `@ws/api` in the worker runtime).

**Reliable queue (at-least-once):** workers consume `linky:queue:jobs:v2` via `BLMOVE` into a per-worker processing list `linky:queue:jobs:processing:{workerId}`, then `LREM` (ack) on success. Each worker refreshes a `linky:worker:heartbeat:{workerId}` key (TTL 30s, refresh every 10s); a reaper goroutine/interval scans processing lists and `RPOPLPUSH`es items back to the main queue when the owning worker's heartbeat is missing. Terminal failures (4xx from internal API, retries exhausted, panics, unparseable payloads) are pushed to `linky:queue:jobs:dlq:v1` as JSON `JobDlqEntry`. Producers (`apps/api`) only see the main queue key — processing/DLQ/heartbeat keys are worker-internal.

## Backend Architecture (apps/api)

The API follows strict domain-driven design. Key rule: **domains must NOT import other domains**.

### Layer Structure (apps/api/src/)

- **domains/** - Business logic grouped by domain (user, video-chat, matchmaking, reports, admin, embeddings, notification). Each domain has: `http/` (route handlers), `service/` (business logic), `socket/` (realtime handlers), `types/`, `index.ts` (public exports)
- **infra/** - External system integrations (Redis, Supabase/Postgres, MQTT, S3, Clerk, Ollama). No business logic here.
- **routes/** - Express route composition and mounting. Wires domain routers to URL paths. No business logic.
- **socket/** - Socket.IO server setup, namespace wiring (`/chat`, `/admin`, `/video-chat`), auth middleware
- **contexts/** - Cross-domain orchestration. The ONLY place where multiple domains can be coordinated.
- **jobs/** - Enqueue helpers and job modules invoked from domains or contexts (Redis-backed)
- **worker/** - Job execution helpers used by internal worker HTTP routes and in-process enqueue fallbacks
- **middleware/** - Express middleware (Clerk auth, admin check, rate limiting, graceful shutdown)
- **types/** - Cross-domain shared types, database types, socket event types
- **config/** - Environment variable loading and validation

### Cross-Domain Coordination

When a feature needs data from multiple domains, use `src/contexts/` for orchestration. Never import between domains directly. Inject functions/interfaces instead.

### Cache Pattern

Redis is read-optimization only, never source of truth. Uses cache-aside pattern with `getOrSet()`. Cache keys in `infra/redis/keys.ts`, TTLs in `infra/redis/policy.ts`. All Redis operations are wrapped with `withRedisTimeout()` (default 5s) to prevent hanging — **cache failures are logged and swallowed, never rethrown**.

### Logging (Pino)

For all levels: `logger.<level>([mergingObject], [message], [...interpolationValues])`. Put the merging object (error or context) first, then the message, then any interpolation values (e.g. `logger.error(err, "Unexpected error in GET /users")` or `logger.warn(err, "Failed for user %s", userId)`).

### Backend Error Response Format

All route handlers return `{ error: "ErrorType", message: "description" }` on failure with standard HTTP status codes (400, 401, 403, 404, 500). Errors are logged with `logger.error()` before responding.

### Internal Worker Transport

The worker calls API endpoints under `/internal/worker/v1`. The API exposes these routes on a separate, internal-only listener (Unix socket in Docker via `INTERNAL_API_SOCKET_PATH`, or `127.0.0.1:INTERNAL_API_PORT` for native dev) — they are not reachable on the public listener (port 7270). Set `INTERNAL_API_SOCKET_PATH` on both api and worker for Docker, or `INTERNAL_API_BASE_URL=http://127.0.0.1:7271` on the worker for native dev. No Bearer secret — segmentation is enforced at the transport layer.

## Frontend Architecture (apps/web)

Next.js 16 App Router with route groups:
- `(app)/` - Authenticated pages
- `(auth)/` - Login/signup
- `(marketing)/` - Public pages

State: Zustand stores + TanStack React Query for server data. Real-time: Socket.IO client + MQTT. Auth: Clerk (`@clerk/nextjs`).

### Layer Structure (apps/web/src/)

Dependency direction is **inward**: app → features → entities → shared → lib.

| Layer | Responsibility | Must NOT import from |
|-------|----------------|----------------------|
| **app/** | Routing, layouts, page composition, API route handlers | — |
| **features/** | Use-case and UI per feature (admin, auth, call, chat, marketing, notifications, realtime, user) | Other features (except allowed e.g. realtime) |
| **entities/** | Domain models and types (call-history, notification, user) | features |
| **shared/** | Reusable, domain-agnostic code (layouts, generic data-table, hooks, utils) | features, entities |
| **lib/** | HTTP, auth, cache, realtime, telemetry, push, messaging, monitoring | entities, features |
| **actions/** | Server actions | features (only lib, entities, shared types/env) |
| **providers/** | React context | — |

- **Entity vs feature:** Entity = core data concept used by multiple features (types, optional model/api). Feature = user-facing capability (ui, hooks, api, model, types). Single-feature-only types can live in that feature.
- **shared** must not contain domain-specific UI; put column definitions in the owning feature and pass to generic DataTable.
- **lib** must not depend on entities or features; use minimal types in lib or pass types from caller.

### lib Submodules (apps/web/src/lib/)

| Submodule | Contents |
|-----------|----------|
| `http/` | `server-api.ts` (serverFetch), `client-api.ts`, `backend-url.ts` (URL builders), `api-url.ts`, `urls/` (grouped URL builders), `adapters/` |
| `auth/` | `token.ts` — Clerk token retrieval |
| `cache/` | `tags.ts` — Next.js cache tag constants |
| `monitoring/` | `with-action.ts` — `withSentryAction()`, `withSentryQuery()` |
| `telemetry/` | Analytics event helpers |
| `realtime/` | Socket.IO client factory, health tracking |
| `messaging/` | MQTT client |
| `push/` | Push notification service worker |

### Server vs Client Component Pattern

Pages follow a consistent split: `page.tsx` is a server component that fetches data via `serverFetch()` and passes it as props to a `*-client.tsx` sibling that handles interactivity. The `-client.tsx` suffix naming is the project convention for client components.

**Example:**
```tsx
// app/dashboard/page.tsx (server)
export default async function DashboardPage() {
  const user = await serverFetch(backendUrl.users.me(), { token: true });
  return <DashboardClient initialUser={user} />;
}

// app/dashboard/dashboard-client.tsx (client)
'use client';
export function DashboardClient({ initialUser }) { ... }
```

Server actions use `withSentryAction()` from `@/lib/monitoring/with-action` and `serverFetch()` from `@/lib/http/server-api` with `{ token: true }` to auto-inject Clerk auth tokens:

```typescript
'use server'
export async function myAction(params) {
  return withSentryAction("myAction", async () => serverFetch(url, { token: true, ... }));
}
```

Server page queries with Next.js data cache use `withSentryQuery()`:

```typescript
return withSentryQuery("queryName", (token) => serverFetch(url, { preloadedToken: token }), {
  keyParts: ["key"],
  tags: ["cache-tag"],
});
```

### Centralized API URL Builders

Never hardcode API URLs. Use `backendUrl` from `@/lib/http/backend-url`:
- `backendUrl.users.*` — user profile, settings, blocks, interest-tags, streak, level, progress
- `backendUrl.admin.*` — admin CRUD for all admin resources
- `backendUrl.resources.*` — changelogs, call-history, favorites, interest-tags, reports
- `backendUrl.notifications.*`, `backendUrl.push.*`, `backendUrl.media.*`
- `backendUrl.economy.*` — economy/shop/boost endpoints
- `backendUrl.videoChat.*`, `backendUrl.matchmaking.*`

### API Type Namespaces

Large API types are organized as namespaces in the owning feature's `types/` folder (e.g. `features/admin/types/admin.types.ts`). Pattern: `AdminAPI.Broadcasts.Get.Response`, `AdminAPI.Users.Patch.Body`.

### Admin Role System

Two-tier roles: `admin` and `superadmin`. Use utilities in `apps/web/src/shared/utils/roles.ts`:
- `isAdmin(role)` — true for both admin and superadmin
- `isSuperAdmin(role)` — true only for superadmin

Backend: role is cached in Redis (5-min TTL) via `apps/api/src/infra/admin-cache/`. Admin middleware and Socket.IO admin namespace middleware both use this cache.

### Import Aliases

- `@/*` maps to `src/*` (both apps)
- `@ws/ui/*` maps to shared UI components
- Workspace packages use `@ws/<package>` imports

### Frontend Environment Variables

**Never access process.env directly in apps/web.** Use the validated env modules:

| Module | Import | Use In |
|--------|--------|--------|
| @/env/public-env | publicEnv | Client components, hooks, shared lib |
| @/env/server-env | serverEnv | Server Components, Route Handlers, Server Actions |

- NEXT_PUBLIC_* vars go in public-env.ts (strip NEXT_PUBLIC_ prefix in export)
- Server-only secrets go in server-env.ts
- Both use Zod .strict() validation at startup

### Internationalization (next-intl)

- **Locales:** `en` (default) and `vi`. **`localePrefix: "as-needed"`** in [`apps/web/src/i18n/routing.ts`](apps/web/src/i18n/routing.ts): English has **no** prefix (`/call`), Vietnamese uses **`/vi/...`** (`/vi/call`). Use **`Link`**, **`useRouter`**, and **`usePathname`** from [`apps/web/src/i18n/navigation.ts`](apps/web/src/i18n/navigation.ts); `usePathname()` returns the pathname **without** the locale prefix. Keep **`useSearchParams`** from `next/navigation` where needed.
- **UI language preference** is **not** stored in Postgres; it lives in the persisted client store [`apps/web/src/shared/model/locale-preference-store.ts`](apps/web/src/shared/model/locale-preference-store.ts) (`localStorage`). [`apps/web/src/providers/i18n/locale-sync.tsx`](apps/web/src/providers/i18n/locale-sync.tsx) aligns the URL with that preference after hydration.
- **Wiring:** `createNextIntlPlugin("./src/i18n/request.ts")` in [`apps/web/next.config.ts`](apps/web/next.config.ts); [`apps/web/src/i18n/request.ts`](apps/web/src/i18n/request.ts) loads [`apps/web/src/messages/{locale}.json`](apps/web/src/messages/en.json). Root layout uses `NextIntlClientProvider`; locale-aware navigation helpers live under `src/i18n/`. [`apps/web/src/proxy.ts`](apps/web/src/proxy.ts) composes Clerk with next-intl; **`/api`** and **`/trpc`** skip `intlMiddleware` (return `NextResponse.next()`).
- **Messages:** Add user-facing copy to `en.json` and keep **`vi.json` in key-for-key parity**. Use nested objects and ICU placeholders (`{count}`, `{name}`) for dynamic segments. Common top-level namespaces include `common`, `errors`, `errorsPage`, `notFoundPage`, `user`, `admin`, `dataTable` (with nested sections such as `dataTable.users`, `dataTable.importInterestTags`), `chat`, `call`, `settings`, `notifications`, `development`, etc.
- **Client UI:** Use `useTranslations('namespace')` from `next-intl` in client components and client hooks (e.g. hooks that call `toast`). For nested keys, use dot paths: `t('dataTable.importInterestTags.dialogTitle')`.
- **Data tables:** Column definitions live in `shared/ui/data-table/**/define-data.tsx`. Export **`useXxxColumns(callbacks?)`** hooks that call `useTranslations` and return `useMemo`’d column defs; sibling `*-data-table.tsx` files call that hook (do not export a static `columns` factory for new work). Translate headers, action labels, `aria-label`s, and confirmation copy.
- **API errors / realtime:** Prefer typed `BackendUserMessage` / `BackendI18nPayload` from `@ws/shared-types` on the server; the web app resolves copies via helpers such as `resolveBackendMessage` and HTTP `ApiError` parsing where those flows exist. Do not hardcode user-facing English in API bodies when a structured `userMessage` is available.
- **Env:** For any new public env vars used by the frontend, follow the [Frontend Environment Variables](#frontend-environment-variables) section above.

## Code Conventions

- **Comments are forbidden by default.** Only add comments to explain WHY, never WHAT. Prefer clear naming and structure.
- **No emojis** in code, docs, or responses unless user explicitly requests them. Exception: toast strings and Interest Tags icon input.
- **File naming**: All files should be in kebab-case.
- **Type placement**: Feature-specific types in `features/<feature>/types/`. Cross-domain entity types in `entities/<entity>/types/`. Generic shared types in `shared/types/`. Backend: domain-specific in `domains/<domain>/types/`, cross-domain in `src/types/`.
- **Icons**: Use `@tabler/icons-react` for new icons (migrating away from lucide-react).

## Tech Stack Quick Reference

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Express.js + TypeScript |
| Frontend | Next.js 16 + React 19 |
| Database | Supabase (Postgres) + pgvector |
| Cache | Redis |
| Background jobs | Redis queues; `worker` app |
| Auth | Clerk |
| Realtime | Socket.IO + MQTT |
| Storage | AWS S3 |
| UI | Radix UI + shadcn + Tailwind CSS 4 |
| State | Zustand + TanStack React Query |
| i18n | next-intl (messages in `apps/web/src/messages/`) |
| Testing | Vitest (unit) + Playwright (e2e) |
| Logging | Pino (@ws/logger) |

## Docker

Both Dockerfiles live at the repo root with build context `.`:
- [`Dockerfile`](Dockerfile) — API image (`mewthedev/linky:latest`); the `worker` service is commented out but uses the same image with `command: worker` for the Node worker path.
- [`Dockerfile.go`](Dockerfile.go) — Go worker image (`mewthedev/linky-go:latest`), used by the active `worker` service in [docker-compose.yml](docker-compose.yml).

Compose services: `api` (host port 7270), `worker` (Go, container `linky-worker`), `redis`, `ollama`. API container health: `node dist/healthcheck.js`. Local `.env` is loaded via Compose `env_file`. Workers reach the API over a shared Unix socket at `INTERNAL_API_SOCKET_PATH=/var/run/linky/api.sock` (volume `backend-data` mounted on both api and worker).

Build images locally via `pnpm docker:build:api` / `pnpm docker:build:worker` (both use the root Dockerfiles).

HTTP health: `GET /healthz` on the API.
