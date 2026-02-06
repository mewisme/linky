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
  logger/       Pino-based logging (@repo/logger)
  eslint-config/      Shared ESLint configs
  typescript-config/  Shared TypeScript configs
```

## Backend Architecture (apps/api)

The API follows strict domain-driven design. Key rule: **domains must NOT import other domains**.

### Layer Structure (apps/api/src/)

- **domains/** - Business logic grouped by domain (user, video-chat, matchmaking, reports, admin, embeddings). Each domain has: `http/` (route handlers), `service/` (business logic), `socket/` (realtime handlers), `types/`, `index.ts` (public exports)
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

Redis is read-optimization only, never source of truth. Uses cache-aside pattern with `getOrSet()`. Cache keys in `infra/redis/keys.ts`, TTLs in `infra/redis/policy.ts`.

## Frontend Architecture (apps/web)

Next.js 16 App Router with route groups:
- `(app)/` - Authenticated pages
- `(auth)/` - Login/signup
- `(marketing)/` - Public pages

State: Zustand stores + TanStack React Query for server data. Real-time: Socket.IO client + MQTT. Auth: Clerk (`@clerk/nextjs`).

### Import Aliases

- `@/*` maps to `src/*` (both apps)
- `@repo/ui/*` maps to shared UI components
- Workspace packages use `@repo/<package>` imports

## Code Conventions

- **Comments are forbidden by default.** Only add comments to explain WHY, never WHAT. Prefer clear naming and structure.
- **No emojis** in code, docs, or responses unless user explicitly requests them. Exception: toast strings and Interest Tags icon input.
- **File naming**: All files should be in kebab-case.
- **Type placement**: Domain-specific types in `domains/<domain>/types/`. Cross-domain types in `src/types/`. Database types in `src/types/database/`.
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
| Logging | Pino (@repo/logger) |

## Docker

Backend runs via Docker Compose with profiles: `app` (API service), `infra` (Redis), `ollama` (embedding model). Health check endpoint: `GET /healthz`.
