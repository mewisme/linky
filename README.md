# Linky

Linky is a real-time 1-to-1 video chat platform: matchmaking, WebRTC calls, chat, profiles, and admin tooling. The codebase is a [Turborepo](https://turbo.build/) monorepo (pnpm workspaces, Node.js 20+).

## Repository layout

| Path | Role |
| --- | --- |
| [`apps/web`](apps/web) | Next.js 16 frontend (App Router, Clerk, Socket.IO, MQTT) |
| [`apps/api`](apps/api) | Express API (domain-driven design), public HTTP + internal worker listener |
| [`apps/worker`](apps/worker) | Background workers: **Go** (production/Docker) and **Node** (local dev); Redis queues |
| [`packages/*`](packages) | Shared libraries — config, types, validation, UI, queue SDK, worker HTTP contract |

### Shared packages

| Package | Purpose |
| --- | --- |
| `@ws/config` | Shared env parsing (Zod) |
| `@ws/database-types` | Supabase-oriented DB types |
| `@ws/shared-types` | Cross-app types (queues, sockets, API payloads) |
| `@ws/validation` | Zod schemas for job envelopes |
| `@ws/sdk-internal` | Redis enqueue/dequeue helpers |
| `@ws/worker-api` | Internal worker HTTP paths and env |
| `@ws/logger` | Pino logging bootstrap |
| `@ws/ui` | Shared React components (Radix + shadcn) |

Queue payload shapes live in `@ws/shared-types` and `@ws/validation`. The API enqueues via Redis; workers dequeue and call the API over an **internal-only** transport (see [Workers](#workers)).

## Tech stack

| Area | Technology |
| --- | --- |
| Monorepo | Turborepo, pnpm 11.1+ |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, next-intl (`en`, `vi`) |
| Backend | Express.js, TypeScript |
| Realtime | Socket.IO, MQTT, WebRTC (STUN/TURN) |
| Data | Supabase (Postgres + pgvector), Redis |
| Auth | Clerk |
| Storage | AWS S3 |
| Jobs | Redis queues + worker apps |
| AI / embeddings | Ollama (optional in Docker) |
| Tests | Vitest (API unit), Playwright (e2e) |

## Prerequisites

- **Node.js** 20+ (see `engines` in root `package.json`)
- **pnpm** 11.1+ (`corepack enable` or install globally; version pinned in `packageManager`)
- **Go** 1.26+ (API and worker Go modules: `apps/api/go.mod`, `apps/worker/go.mod`)
- **Docker** (optional — Redis, API, Go worker, Ollama via Compose)

## Quick start

### 1. Install

```bash
pnpm install
```

### 2. Environment

Most services read a **root** [`.env`](.env) at the repo root (the API loads it from `apps/api`). You need credentials and URLs for the pieces you run, for example:

- **Clerk** — `CLERK_SECRET_KEY`, web `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Supabase** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Redis** — `REDIS_URL` (required for cache, matchmaking, queues)
- **S3** — bucket and access keys for media
- **Web** — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, and other `NEXT_PUBLIC_*` vars (validated in `apps/web/src/env/`)

See [`apps/api/src/config/index.ts`](apps/api/src/config/index.ts) and app-specific READMEs for the full variable set.

### 3. Run locally

```bash
# All apps (Turbo)
pnpm dev

# Or individually
pnpm dev:web    # http://localhost:3000
pnpm dev:api    # http://localhost:7270 (PORT overridable)
pnpm dev:worker # Node worker
```

**Go worker** (matches production):

```bash
pnpm dev:worker-go
# or after build: apps/worker/bin/worker
```

For native dev, point the worker at the internal API listener:

```bash
INTERNAL_API_BASE_URL=http://127.0.0.1:7271
```

The public API stays on port **7270**; internal routes are not mounted there.

### 4. Docker (optional)

```bash
docker compose up
```

[`docker-compose.yml`](docker-compose.yml) runs **api** (7270), **worker** (Go image), **redis**, and **ollama**. API and worker share a Unix socket at `INTERNAL_API_SOCKET_PATH=/var/run/linky/api.sock` (volume `backend-data`). Load secrets via Compose `env_file: .env`.

Build images locally:

```bash
pnpm docker:build:api
pnpm docker:build:worker
```

## Commands

| Task | Command |
| --- | --- |
| Dev (all) | `pnpm dev` |
| Dev web / api / worker | `pnpm dev:web`, `pnpm dev:api`, `pnpm dev:worker`, `pnpm dev:worker-go` |
| Build (all) | `pnpm build` |
| Build web / api | `pnpm build:web`, `pnpm build:api` |
| Build Go API / worker | `pnpm build:api-go`, `pnpm build:worker-go` |
| Production start | `pnpm start:api`, `pnpm start:web`, `pnpm start:worker` |
| Lint | `pnpm lint`, `pnpm lint:web`, `pnpm lint:api` |
| Types | `pnpm check-types`, `pnpm check-types:web`, `pnpm check-types:api` |
| Format | `pnpm format` |
| API unit tests | `cd apps/api && pnpm vitest run` |
| E2E | `pnpm test`, `pnpm test:ui`, `pnpm test:debug` |

CI (on PRs and `main`): lint, typecheck, monorepo build, and Go API/worker build + tests — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Architecture

### Backend (`apps/api`)

- **Domains** under `src/domains/` — no cross-domain imports; orchestrate in `src/contexts/`.
- **Infra** (`src/infra/`) — Redis, Supabase, S3, Clerk, MQTT, Ollama only; no business rules.
- **Routes** (`src/routes/`) — HTTP composition; **sockets** under `src/socket/`.
- Redis is **cache-aside** only (not source of truth); cache failures are logged and swallowed.

Details: [`apps/api/README.md`](apps/api/README.md).

### Frontend (`apps/web`)

- App Router route groups: `(app)`, `(auth)`, `(marketing)`.
- Layers (inward): `app` → `features` → `entities` → `shared` → `lib`.
- Server pages fetch in `page.tsx`; interactivity in `*-client.tsx` siblings.
- Env: use `@/env/public-env` and `@/env/server-env` — never raw `process.env` in app code.

Details: [`apps/web/README.md`](apps/web/README.md).

### Workers

```text
API  --enqueue-->  Redis queues  --dequeue-->  worker (Node or Go)
                                                    |
                                                    v
                              POST /internal/worker/v1/...  (internal listener)
```

- Job handlers run in the API process; workers only pull jobs and invoke internal HTTP.
- **Transport:** Unix socket (`INTERNAL_API_SOCKET_PATH`) in Docker, or `127.0.0.1:INTERNAL_API_PORT` (default **7271**) locally. No bearer token — isolation is by listener/network, not shared secrets on the wire.
- Contracts: `@ws/worker-api`, `@ws/sdk-internal`, `@ws/shared-types`, `@ws/validation`.

Production worker image: `apps/worker/Dockerfile.go`. Root `Dockerfile` builds the API (and can run Node worker via entrypoint for legacy paths).

## Health

| Check | Location |
| --- | --- |
| HTTP | `GET /healthz` on the public API port |
| Container | `node dist/healthcheck.js` in the API image |

## Further reading

| Doc | Contents |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Monorepo conventions, layer rules, i18n, logging |
| [`apps/api/README.md`](apps/api/README.md) | Auth, matchmaking, sockets, admin, embeddings |
| [`apps/web/README.md`](apps/web/README.md) | WebRTC UI, realtime, admin dashboard |

## License

MIT — see [`package.json`](package.json).
