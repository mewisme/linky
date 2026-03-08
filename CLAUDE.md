# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linky is a real-time video chat platform. Turborepo monorepo with pnpm 10.28.2 and Node.js 20+.

## Common Commands

```bash
# Development
pnpm dev                # All apps
pnpm dev:api            # Backend only (Express, port 3001)
pnpm dev:web            # Frontend only (Next.js, port 3000)

# Build
pnpm build              # All packages
pnpm build:api          # API only
pnpm build:web          # Web only

# Lint & Type Check
pnpm lint               # ESLint all
pnpm lint:api           # ESLint API
pnpm lint:web           # ESLint web
pnpm check-types        # TypeScript check all
pnpm format             # Prettier

# Testing - Backend Unit (Vitest)
cd apps/api
pnpm vitest run                          # All unit tests
pnpm vitest run src/__tests__/cache      # Test directory
pnpm vitest run src/__tests__/domains/user.test.ts  # Single file

# Testing - E2E (Playwright, from root)
pnpm test               # All e2e tests
pnpm test:ui            # Playwright UI mode
pnpm test:debug         # Debug mode
pnpm test:report        # View HTML report
```

## Monorepo Structure

```
apps/
  api/          Express.js backend (domain-driven architecture)
  web/          Next.js 16 frontend (App Router)
packages/
  ui/           Shared React component library (Radix UI + shadcn)
  logger/       Pino-based logging (@ws/logger)
  eslint-config/      Shared ESLint configs
  typescript-config/  Shared TypeScript configs
```

## Backend Architecture (apps/api)

The API follows strict domain-driven design. Key rule: **domains must NOT import other domains**.

### Layer Structure (apps/api/src/)

- **domains/** - Business logic grouped by domain (user, video-chat, matchmaking, reports, admin, embeddings, notification). Each domain has: `http/` (route handlers), `service/` (business logic), `socket/` (realtime handlers), `types/`, `index.ts` (public exports)
- **infra/** - External system integrations (Redis, Supabase/Postgres, MQTT, S3, Clerk, Ollama). No business logic here.
- **routes/** - Express route composition and mounting. Wires domain routers to URL paths. No business logic.
- **socket/** - Socket.IO server setup, namespace wiring (`/chat`, `/admin`, `/video-chat`), auth middleware
- **contexts/** - Cross-domain orchestration. The ONLY place where multiple domains can be coordinated.
- **middleware/** - Express middleware (Clerk auth, admin check, rate limiting, graceful shutdown)
- **types/** - Cross-domain shared types, database types, socket event types
- **config/** - Environment variable loading and validation

### Cross-Domain Coordination

When a feature needs data from multiple domains, use `src/contexts/` for orchestration. Never import between domains directly. Inject functions/interfaces instead.

### Cache Pattern

Redis is read-optimization only, never source of truth. Uses cache-aside pattern with `getOrSet()`. Cache keys in `infra/redis/keys.ts`, TTLs in `infra/redis/policy.ts`. All Redis operations are wrapped with `withRedisTimeout()` (default 5s) to prevent hanging — cache failures are logged and swallowed, never rethrown.

### Logging (Pino)

For all levels: `logger.<level>([mergingObject], [message], [...interpolationValues])`. Put the merging object (error or context) first, then the message, then any interpolation values (e.g. `logger.error(err, "Unexpected error in GET /users")` or `logger.warn(err, "Failed for user %s", userId)`).

### Backend Error Response Format

All route handlers return `{ error: "ErrorType", message: "description" }` on failure with standard HTTP status codes (400, 401, 403, 404, 500). Errors are logged with `logger.error()` before responding.

## Frontend Architecture (apps/web)

**Full contract:** [docs/FRONTEND_ARCHITECTURE_GUIDELINES.md](docs/FRONTEND_ARCHITECTURE_GUIDELINES.md) — layers, import rules, checklists, migration, and step-by-step guides for adding features/entities.

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

Server actions use `withSentryAction()` from `@/lib/monitoring/with-action` and `serverFetch()` from `@/lib/http/server-api` to auto-inject Clerk auth tokens:

```typescript
'use server'
export async function myAction(params) {
  return withSentryAction("myAction", async () => serverFetch(url));
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
| Auth | Clerk |
| Realtime | Socket.IO + MQTT |
| Storage | AWS S3 |
| UI | Radix UI + shadcn + Tailwind CSS 4 |
| State | Zustand + TanStack React Query |
| Testing | Vitest (unit) + Playwright (e2e) |
| Logging | Pino (@ws/logger) |

## Docker

Backend runs via Docker Compose with profiles: `app` (API service), `infra` (Redis), `ollama` (embedding model). Health check endpoint: `GET /healthz`.
