# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linky is a real-time 1-to-1 video chat platform. The repo is a Turborepo / pnpm workspace plus a single Go module:

- `apps/web` — Next.js 16 frontend (`@ws/web`)
- `apps/api` — Go API (module `linky-api`); single binary that serves HTTP, Socket.IO, and an in-process Redis-backed worker pool
- `packages/ui`, `packages/eslint-config`, `packages/typescript-config`
- `e2e/playwright` — Playwright E2E tests (`@ws/playwright-e2e`)
- `e2e/pytest` — Python Selenium E2E tests (standalone uv project)

`zod` is pinned to `4.3.6` via `pnpm.overrides`. Don't bump it without coordination.

## Common Commands

```bash
# Dev
pnpm dev          # all (turbo)
pnpm dev:web      # Next.js, port 3000
pnpm dev:api      # Go API with Air (live reload); default PORT 7270 (override via env)

# Build
pnpm build:web
pnpm build:api    # output: apps/api/bin/api

# Run prod-built binary
pnpm start:web
pnpm start:api    # ./apps/api/bin/api

# Docker
pnpm docker:build:api   # docker build -f Dockerfile -t linky-api:local .

# Lint / types / format
pnpm lint
pnpm lint:web
pnpm check-types
pnpm check-types:web
pnpm format

# E2E — Playwright (from root)
pnpm test
pnpm test:ui
pnpm test:debug
pnpm test:trace
pnpm test:report
pnpm exec playwright test --config e2e/playwright/playwright.config.ts tests/user-profile.spec.ts
pnpm exec playwright test --config e2e/playwright/playwright.config.ts -g "should update avatar"

# E2E — Python (pytest + Selenium + CloakBrowser, from e2e/pytest/)
cd e2e/pytest && uv sync && uv run ensure-cloak   # one-time setup; downloads ~200MB
cd e2e/pytest && uv run pytest                    # all
cd e2e/pytest && uv run pytest tests/video_chat   # serial — never use -n auto for video_chat

# Single-package Turbo
pnpm exec turbo run check-types --filter=@ws/ui

# Versioning
pnpm upver
```

## Monorepo Structure

```
apps/
  api/            Go API (module linky-api). Source in src/. Migrations in migrations/.
  web/            Next.js 16 frontend (App Router)
e2e/
  playwright/     Playwright E2E tests (@ws/playwright-e2e)
  pytest/         Python Selenium E2E tests (standalone uv project)
packages/
  eslint-config/      Shared ESLint configs
  typescript-config/  Shared TS configs
  ui/                 Shared React library (Radix + shadcn) — @ws/ui
```

## Backend (`apps/api`, Go)

Single Go binary. Entrypoint [`apps/api/src/cmd/api/main.go`](apps/api/src/cmd/api/main.go). Stack: Echo (HTTP), `zishang520/socket.io` (realtime), `zerolog` (logging), `redis/go-redis` (queues), `supabase-community/supabase-go` + raw PostgREST RPCs (data), Clerk SDK (auth), Cloudflare Realtime (SFU).

### Layer structure (`apps/api/src/`)

```
src/
  cmd/api/                      main.go
  internal/
    config/                     env parsing
    server/                     Echo bootstrap
    transport/
      http/                     HTTP routes (package `routes`; import path transport/http)
        middleware/             Clerk, admin, request id, rate limit, access log
      socketio/                 Socket.IO namespaces (/chat, /admin, /video-chat)
      worker/                   Job dispatch → app workflows
    app/                        Use-case orchestration (callended, user, videochat, matchmaking, report, …)
    domain/                     Pure business rules (matchmaking, rooms, user/exp, user/progress, embeddings)
    jobs/                       Envelopes + enqueue helpers
    jobs/pool/                  Worker pool (BLMOVE + heartbeat + reaper)
    infra/                      Integrations only (supax, redisx, clerkx, …)
      supax/                    Supabase/PostgREST; subpackages: client/, rpc/, webhook/, favorites/, streaks/, embeddings/, reports/, codec/
    httpx/                      HTTP helpers (response shapes, errors, request context)
    lib/                        Misc shared helpers
    sharedtypes/                Cross-package Go types
```

### Rules

| Layer | May import | Must not import |
|-------|------------|-----------------|
| `transport/*` | `app`, `httpx`, `domain` (types only where needed) | `infra/supax` directly |
| `app/*` | `domain`, `infra`, `jobs` | other `app` packages (except documented exceptions) |
| `domain/*` | other `domain` packages, stdlib | `infra/*`, `transport/*`, `app/*` |
| `infra/*` | stdlib, vendor SDKs | `domain`, `app`, `transport` |

- **Cross-domain orchestration** lives in `app/`, not a separate `contexts/` tree.
- **Infra has no business rules.** Just integrations.
- **Transport wires handlers**; logic lives in `app/` and `domain/`.
- **Errors** return JSON `{ "error": "...", "message": "..." }`. Log with `logger.X` before responding.
- **Cache.** Redis is read-optimization only, never source of truth. Cache failures are logged and swallowed.

### Worker queues (in-process)

The API process runs its own worker pool. Producers (HTTP handlers, contexts) call `jobs.Enqueue*` which `LPUSH`es a JSON envelope onto `linky:queue:jobs:v2`. The pool consumes via `BLMOVE` into a per-worker processing list `linky:queue:jobs:processing:{workerId}`, runs the handler, then `LREM`s the entry on success. Each worker refreshes `linky:worker:heartbeat:{workerId}` (TTL 30s, refresh 10s); a reaper goroutine moves stranded items back to the main queue when a worker is gone. Terminal failures (panics, retries exhausted, unparseable payloads) land in `linky:queue:jobs:dlq:v1` as JSON `JobDlqEntry`.

There is no separate worker process and no internal HTTP transport — handlers run in the same binary as the API.

### Logging

`zerolog`. Pretty console output in dev, JSON in production (controlled in `internal/logger`). Always pass error/context first: `logger.Error().Err(err).Str("user_id", userID).Msg("...")`.

## Frontend (`apps/web`)

Next.js 16 App Router with route groups:

- `(app)/` — authenticated pages
- `(auth)/` — login/signup
- `(marketing)/` — public

State: Zustand stores + TanStack React Query. Realtime: Socket.IO client. Auth: Clerk (`@clerk/nextjs`).

### Layer structure (`apps/web/src/`)

Dependency direction is **inward**: app → features → entities → shared → lib.

| Layer | Responsibility | Must NOT import from |
|-------|----------------|----------------------|
| **app/** | Routing, layouts, page composition, API route handlers | — |
| **features/** | Use-case + UI per feature (admin, auth, call, chat, marketing, notifications, realtime, user) | Other features (except allowed e.g. realtime) |
| **entities/** | Domain models and types (call-history, notification, user) | features |
| **shared/** | Reusable, domain-agnostic code (layouts, generic data-table, hooks, utils) | features, entities |
| **lib/** | HTTP, auth, cache, realtime, telemetry, push, messaging, monitoring | entities, features |
| **actions/** | Server actions | features (only lib, entities, shared types/env) |
| **providers/** | React context | — |

- **Entity vs feature:** entity = core data concept used by multiple features (types, optional model/api). Feature = user-facing capability (ui, hooks, api, model, types). Single-feature-only types live in that feature.
- **shared** must not contain domain-specific UI; put column definitions in the owning feature and pass them to a generic `DataTable`.
- **lib** must not depend on entities or features; use minimal types in lib or pass types from caller.

### lib submodules (`apps/web/src/lib/`)

| Submodule | Contents |
|-----------|----------|
| `http/` | `server-api.ts` (`serverFetch`), `client-api.ts`, `backend-url.ts` (URL builders), `api-url.ts`, `urls/`, `adapters/` |
| `auth/` | `token.ts` — Clerk token retrieval |
| `cache/` | `tags.ts` — Next.js cache tag constants |
| `monitoring/` | `with-action.ts` — `withSentryAction()`, `withSentryQuery()` |
| `telemetry/` | Analytics event helpers |
| `realtime/` | Socket.IO client factory, health tracking |
| `push/` | Push notification service worker |

### Server vs client component pattern

Pages split into `page.tsx` (server, fetches via `serverFetch()`) and a `*-client.tsx` sibling that handles interactivity. The `-client.tsx` suffix is the project convention.

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

Server actions use `withSentryAction()` from `@/lib/monitoring/with-action` and `serverFetch()` from `@/lib/http/server-api` with `{ token: true }` to auto-inject Clerk auth tokens.

Server page queries with the Next.js data cache use `withSentryQuery()`.

### Centralized API URL builders

Never hardcode API URLs. Use `backendUrl` from `@/lib/http/backend-url`:

- `backendUrl.users.*`
- `backendUrl.admin.*`
- `backendUrl.resources.*`
- `backendUrl.notifications.*`, `backendUrl.push.*`
- `backendUrl.videoChat.*`, `backendUrl.matchmaking.*`
- `backendUrl.me.*` (user S3 uploads)

### API type namespaces

Large API types are organized as namespaces in the owning feature's `types/` folder (e.g. `features/admin/types/admin.types.ts`). Pattern: `AdminAPI.Broadcasts.Get.Response`, `AdminAPI.Users.Patch.Body`.

### Admin role system

Two-tier roles: `admin` and `superadmin`. Use utilities in `apps/web/src/shared/utils/roles.ts`:

- `isAdmin(role)` — true for both admin and superadmin
- `isSuperAdmin(role)` — true only for superadmin

Backend caches the role in Redis (5-min TTL) via `internal/infra/admincache`. The admin HTTP middleware and Socket.IO admin namespace middleware both use this cache.

### Import aliases

- `@/*` → `apps/web/src/*`
- `@ws/ui/*` → shared UI components
- Workspace packages use `@ws/<package>` imports

### Frontend environment variables

**Never access `process.env` directly in `apps/web`.** Use the validated env modules:

| Module | Import | Use in |
|--------|--------|--------|
| `@/env/public-env` | `publicEnv` | Client components, hooks, shared lib |
| `@/env/server-env` | `serverEnv` | Server components, route handlers, server actions |

- `NEXT_PUBLIC_*` vars go in `public-env.ts` (strip `NEXT_PUBLIC_` prefix in export)
- Server-only secrets go in `server-env.ts`
- Both use Zod `.strict()` validation at startup

### Internationalization (next-intl)

- **Locales:** `en` (default) and `vi`. **`localePrefix: "as-needed"`** in [`apps/web/src/i18n/routing.ts`](apps/web/src/i18n/routing.ts): English has no prefix (`/call`), Vietnamese uses `/vi/...` (`/vi/call`). Use `Link`, `useRouter`, `usePathname` from [`apps/web/src/i18n/navigation.ts`](apps/web/src/i18n/navigation.ts); `usePathname()` returns the pathname **without** the locale prefix. Keep `useSearchParams` from `next/navigation` where needed.
- **UI language preference** is not stored in Postgres; it lives in the persisted client store [`apps/web/src/shared/model/locale-preference-store.ts`](apps/web/src/shared/model/locale-preference-store.ts) (`localStorage`). [`apps/web/src/providers/i18n/locale-sync.tsx`](apps/web/src/providers/i18n/locale-sync.tsx) aligns the URL with that preference after hydration.
- **Wiring:** `createNextIntlPlugin("./src/i18n/request.ts")` in [`apps/web/next.config.ts`](apps/web/next.config.ts); [`apps/web/src/i18n/request.ts`](apps/web/src/i18n/request.ts) loads [`apps/web/src/messages/{locale}.json`](apps/web/src/messages/en.json). Root layout uses `NextIntlClientProvider`. [`apps/web/src/proxy.ts`](apps/web/src/proxy.ts) composes Clerk with next-intl; **`/api`** and **`/trpc`** skip `intlMiddleware`.
- **Messages:** add user-facing copy to `en.json` and keep `vi.json` in key-for-key parity. Use nested objects and ICU placeholders (`{count}`, `{name}`).
- **Client UI:** `useTranslations('namespace')` in client components and client hooks (e.g. hooks that call `toast`). Use dot paths for nested keys.
- **Data tables:** column definitions live in `shared/ui/data-table/**/define-data.tsx`. Export `useXxxColumns(callbacks?)` hooks that call `useTranslations` and return `useMemo`-d column defs; sibling `*-data-table.tsx` files call that hook.
- **API errors / realtime:** use `ApiUserMessage` / `ApiI18nPayload` from `shared/types/api-message.types.ts`; resolve user-facing copy via `resolveBackendMessage`. Don't hardcode English in API bodies when a structured `userMessage` is available.

## Code Conventions

- **Comments are forbidden by default.** Only add comments to explain WHY, never WHAT. Prefer clear naming and structure.
- **No emojis** in code, docs, or responses unless the user explicitly requests them. Exception: toast strings and the Interest Tags icon input.
- **File naming:** kebab-case in TS/JS; standard Go naming for `apps/api`.
- **Type placement (web):** feature-specific types in `features/<feature>/types/`; cross-domain entity types in `entities/<entity>/types/`; generic shared types in `shared/types/`.
- **Type placement (api):** domain-specific types stay inside the domain package; cross-domain types live under `internal/sharedtypes`.
- **Icons:** use `@tabler/icons-react` for new icons (migrating away from lucide-react).

## Tech Stack Quick Reference

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Go 1.26 (Echo, zishang520/socket.io) |
| Frontend | Next.js 16 + React 19 |
| Database | Supabase (Postgres) + pgvector |
| Cache / queues | Redis (jobs only; cache-aside) |
| Auth | Clerk |
| Realtime | Socket.IO + Cloudflare Realtime (SFU) |
| Storage | AWS S3 |
| UI | Radix UI + shadcn + Tailwind CSS 4 |
| State | Zustand + TanStack React Query |
| i18n | next-intl (messages in `apps/web/src/messages/`) |
| Testing | Playwright (TS e2e, `e2e/playwright/`) + pytest/Selenium (Python e2e, `e2e/pytest/`) |
| Logging | zerolog |
| AI | OpenAI-compatible API (`OPENAI_BASE_URL`); separate models for embeddings, broadcast, report-summary |

## Docker

Single Dockerfile at the repo root:

- [`Dockerfile`](Dockerfile) — Go API image (`mewthedev/linky:latest`).

[`docker-compose.yml`](docker-compose.yml) services: `api` (host port 7270), `redis`. API container health: `curl -f http://localhost:${PORT}/healthz`. Compose loads the repo-root `.env` via `env_file`.

Build the image locally: `pnpm docker:build:api`.

HTTP health: `GET /healthz`. Readiness (deps reachable): `GET /readyz`.

## Environment files

Single root [`.env`](.env) is the source of truth for local dev, Docker Compose, and the Go API. Templates at the repo root: [`.env.api.example`](.env.api.example) (server vars), [`.env.web.example`](.env.web.example) (`NEXT_PUBLIC_*`). Next.js will also read `apps/web/.env.local` if present; the Go API only loads the root `.env`. Frontend env access still goes through the validated `@/env/public-env` / `@/env/server-env` modules — never `process.env` in `apps/web`.

## Further reading

- [`apps/api/README.md`](apps/api/README.md) — deeper API layout, env, jobs
- [`README.md`](README.md) — quick start, prerequisites, full env var list
- [`e2e/pytest/README.md`](e2e/pytest/README.md) — Python E2E suite (Clerk test accounts, fixtures)

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol named X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me Y's signature / source / docstring" | `codegraph_node` |
| "Give me focused context for a task/area" | `codegraph_context` — pass **`task`**, not `query` |
| "See several related symbols' source at once" | `codegraph_explore` |
| "What files exist under path/" | `codegraph_files` |
| "Is the index healthy?" | `codegraph_status` |

### Rules of thumb

- **`codegraph_context` uses `task`, not `query`.** Pass the task description as `task`:
  `codegraph_context({ task: "how auth redirects work after sign-in" })`
- **Answer directly — don't delegate exploration.** For "how does X work" / architecture / trace questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
