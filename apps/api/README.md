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

`pnpm dev:api` runs [Air](https://github.com/air-verse/air) via `go run github.com/air-verse/air@v1.65.2` (no global install). Config: `.air.toml`. Rebuilds on changes under `src/`.

Optional global CLI:

```bash
go install github.com/air-verse/air@v1.65.2
cd apps/api && air
```

From `apps/api` without Air:

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

## GraphQL

- Endpoint: `POST /api/v1/graphql` (Clerk + Supabase `users.role` + rate limit)
- gqlgen resolvers in `src/internal/app/graphql/` (see [GRAPHQL.md](./GRAPHQL.md))
- Regenerate: `cd src/internal/app/graphql && go generate`

Example:

```graphql
query ViewerBoot {
  viewer {
    me
    details
    settings
    profile
    level
    streak
    progress
  }
}
```
