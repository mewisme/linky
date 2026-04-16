# Linky

Linky is a real-time video chat platform built as a Turborepo monorepo. It includes a Next.js frontend, an Express API, and dedicated workers for background jobs.

## What Is In This Repo

- `apps/web` - Next.js 16 + React 19 frontend
- `apps/api` - Express + TypeScript backend (domain-driven architecture)
- `apps/worker` - background worker (Redis queues; calls internal API to execute jobs)
- `packages/*` - shared libraries (`@ws/ui`, `@ws/logger`, `@ws/config`, types, validation)

## Tech Stack

| Area | Technology |
| --- | --- |
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Express.js, TypeScript |
| Realtime | Socket.IO, MQTT, WebRTC |
| Data | Supabase (Postgres + pgvector), Redis |
| Auth | Clerk |
| Jobs | Redis queues + worker apps |
| Tests | Vitest, Playwright |

## Prerequisites

- Node.js 20+
- pnpm 10.33.0+
- Docker (optional, for local infra/services)

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:
   - Copy the example env files for apps you run (API, web, workers).
   - Fill in required values (Clerk, Supabase, Redis, S3, MQTT, etc).

3. Start development:

```bash
pnpm dev
```

Default local ports:
- Web: `http://localhost:3000`
- API: `http://localhost:7270`

## Useful Commands

```bash
# Development
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm dev:worker

# Build
pnpm build
pnpm build:web
pnpm build:api

# Lint and type-check
pnpm lint
pnpm lint:web
pnpm lint:api
pnpm check-types
pnpm check-types:web
pnpm check-types:api
pnpm format

# Tests
cd apps/api && pnpm vitest run
pnpm test
pnpm test:ui
pnpm test:debug
pnpm test:trace
pnpm test:report
```

## Architecture Notes

### Backend (`apps/api`)

- Follows strict domain boundaries: domains do not import other domains.
- Cross-domain orchestration belongs in `src/contexts`.
- `src/infra` is for integrations only (Redis, Supabase, S3, Clerk, MQTT).
- Redis is cache/read-optimization, not source of truth.

### Frontend (`apps/web`)

- App Router structure with route groups: `(app)`, `(auth)`, `(marketing)`.
- Layer direction is inward: `app -> features -> entities -> shared -> lib`.
- Uses Zustand for client state and TanStack Query for server data.

### Workers

- API enqueues jobs.
- `worker` dequeues from the AI and general Redis queues and invokes private HTTP endpoints on the API to run job handlers.

Shared queue contracts and validation live in workspace packages (`@ws/shared-types`, `@ws/validation`).

## Docker

Local containers are defined in:

- `docker-compose.yml`
- `docker-compose.local.yml`

Typical services include API, workers, Redis, and Ollama.

## Health and Runtime

- API health endpoint: `GET /healthz`
- API production healthcheck script: `apps/api/dist/healthcheck.js`

## Additional Docs

- `apps/api/README.md`
- `apps/web/README.md`
- `CLAUDE.md` (project operating guidance and architecture boundaries)
