# Linky API (`@ws/api`)

Go HTTP API, Socket.IO, and in-process Redis job workers. Module `linky-api`, entrypoint `src/cmd/api`.

## Commands

From the repo root:

```bash
pnpm dev:api
pnpm build:api
pnpm start:api
pnpm docker:build:api
```

`pnpm dev:api` runs `go run ./src/cmd/api` from `apps/api`. Restart manually after code changes.

```bash
go run ./src/cmd/api
go build -o bin/api ./src/cmd/api
```

## Layout

```
src/
  cmd/api/          main
  internal/         config, routes, domains, contexts, infra, jobs, worker, socketio
migrations/         Postgres migrations
```

## Environment

See `src/internal/config` and repo-root `.env` used by Docker Compose.
