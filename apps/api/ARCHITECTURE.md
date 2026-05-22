# Linky API — modular monolith layout

```mermaid
flowchart TB
  main[cmd/api/main.go]
  transport_http[transport/http]
  transport_socketio[transport/socketio]
  transport_worker[transport/worker]
  app[app/* workflows]
  domain[domain/* rules]
  infra[infra/* integrations]

  main --> transport_http
  main --> transport_socketio
  main --> transport_worker
  transport_http --> app
  transport_socketio --> app
  transport_worker --> app
  app --> domain
  app --> infra
  domain -.->|no infra| infra
```

## Dependency rule

Requests enter **transport**, which calls **app** workflows. **App** loads data via **infra** and applies **domain** rules. **Domain** packages stay free of database and HTTP details.

## Supabase (`infra/supax`)

- Root `supax` package: bridge + shared repositories (`repositories.go`, `extra.go`, …)
- Subpackages: `client/`, `rpc/`, `webhook/`, `favorites/`, `streaks/`, `embeddings/`, `reports/`, `codec/`, `postgrest/`
- Root `*_alias.go` files re-export subpackage symbols for backward-compatible imports
