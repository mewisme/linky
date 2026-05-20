# Linky

Linky is a real-time 1-to-1 video chat platform: matchmaking, WebRTC (Cloudflare SFU) calls, chat, profiles, and admin tooling. The repo is a Turborepo / pnpm workspace plus a single Go module.

## Repository layout

| Path | Role |
| --- | --- |
| [`apps/web`](apps/web) | Next.js 16 frontend (App Router, Clerk, Socket.IO) |
| [`apps/api`](apps/api) | Go API (Echo + zishang520/socket.io). Public HTTP, realtime, jobs |
| [`packages/ui`](packages/ui) | Shared React components (Radix + shadcn) |
| [`packages/eslint-config`](packages/eslint-config), [`packages/typescript-config`](packages/typescript-config) | Shared lint and TS config |

## Tech stack

| Area | Technology |
| --- | --- |
| Monorepo | Turborepo, pnpm 11.1+ |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, next-intl (`en`, `vi`) |
| Backend | Go 1.26 (Echo, zishang520/socket.io) |
| Realtime / video | Socket.IO + Cloudflare Realtime (SFU) |
| Data | Supabase (Postgres + pgvector), Redis (jobs only) |
| Auth | Clerk |
| Storage | AWS S3 |
| Jobs | In-process worker pool consuming Redis queues |
| AI / embeddings | OpenAI-compatible API (configurable base URL + model per feature) |
| Tests | Playwright (e2e) |

## Prerequisites

- **Node.js** 20+ (web app + tooling)
- **pnpm** 11.1+ (`corepack enable`; pinned via `packageManager`)
- **Go** 1.26+ (API — `apps/api/go.mod`)
- **Docker** (optional — API + Redis via Compose)

## Quick start

### 1. Install

```bash
pnpm install
```

### 2. Environment

Use a **single** [`.env`](.env) at the repo root for local dev, Docker Compose, and the Go API. Copy and merge from the templates (examples only — nothing loads `*.example`):

- [`.env.api.example`](.env.api.example) — API / server variables
- [`.env.web.example`](.env.web.example) — web / `NEXT_PUBLIC_*` variables

Next.js also reads `apps/web/.env.local` if you prefer to split web-only secrets locally; the Go API only loads `.env` as above.

Typical variables you'll need to fill in:

- **Clerk** — `CLERK_SECRET_KEY`, web `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Supabase** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Redis** — `REDIS_URL` (worker queues)
- **OpenAI-compatible AI** — required: `OPENAI_API_KEY`, `OPENAI_BASE_URL`; models via admin AI config (`models.embedding`, `models.chat.broadcast`, `models.chat.report_summary`) or optional env `OPENAI_EMBEDDING_MODEL`, `OPENAI_BROADCAST_MODEL`, `OPENAI_REPORT_SUMMARY_MODEL` (optional: `OPENAI_REQUEST_TIMEOUT_MS`, `OPENAI_EMBEDDING_TIMEOUT_MS`)
- **Cloudflare Realtime** — SFU app id + secret
- **S3** — bucket and access keys
- **Web** — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, other `NEXT_PUBLIC_*` (validated in `apps/web/src/env/`)

### 3. Run locally

```bash
pnpm dev:web    # http://localhost:3000
pnpm dev:api    # http://localhost:7270 (PORT overridable)
```

### 4. Docker (optional)

```bash
docker compose up
```

[`docker-compose.yml`](docker-compose.yml) runs **api** (7270) and **redis**. Secrets come from `env_file: .env`.

Build the API image locally:

```bash
pnpm docker:build:api
```

## Commands

| Task | Command |
| --- | --- |
| Dev (all) | `pnpm dev` |
| Dev web / api | `pnpm dev:web`, `pnpm dev:api` |
| Build web | `pnpm build:web` |
| Build Go API | `pnpm build:api` (output: `apps/api/bin/api`) |
| Start prod web / api | `pnpm start:web`, `pnpm start:api` |
| Lint | `pnpm lint`, `pnpm lint:web` |
| Types | `pnpm check-types`, `pnpm check-types:web` |
| Format | `pnpm format` |
| E2E | `pnpm test`, `pnpm test:ui`, `pnpm test:debug` |

## Architecture

### Backend (`apps/api`)

- Go module `linky-api`. Entrypoint: [`apps/api/src/cmd/api`](apps/api/src/cmd/api).
- `internal/domains/*` — business logic. No cross-domain imports; orchestrate in `internal/contexts/`.
- `internal/infra/*` — Supabase, Redis, Cloudflare Realtime, Clerk, OpenAI-compatible AI, web push, S3.
- `internal/routes/*` — Echo route registration; `internal/socketio/*` — Socket.IO namespaces.
- `internal/jobs/*` and `internal/worker/*` — in-process worker pool (BLMOVE + heartbeat + reaper) consuming Redis queues.

Details: [`apps/api/README.md`](apps/api/README.md).

### Frontend (`apps/web`)

- App Router route groups: `(app)`, `(auth)`, `(marketing)`.
- Layers (inward): `app` → `features` → `entities` → `shared` → `lib`.
- Server pages fetch in `page.tsx`; interactivity in `*-client.tsx` siblings.
- Env: use `@/env/public-env` / `@/env/server-env`; never raw `process.env` in app code.

## Health

| Check | Location |
| --- | --- |
| HTTP | `GET /healthz` on the public API port |
| Readiness | `GET /readyz` |

## Further reading

| Doc | Contents |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Monorepo conventions, layer rules, i18n |
| [`apps/api/README.md`](apps/api/README.md) | Go API layout, env vars, jobs |

## License

MIT — see [`package.json`](package.json).
