# 17 -- Deployment

## Purpose

This document describes the deployment architecture of the Linky platform, including Docker containerization, Vercel frontend hosting, infrastructure topology, and the production environment configuration.

## Scope

Covers Dockerfile, docker-compose.yml, Vercel deployment, and infrastructure dependencies.

## Dependencies

- [01-overview.md](01-overview.md) for technology stack

## Cross References

- [16-observability.md](16-observability.md) for health checks
- [19-scalability-strategy.md](19-scalability-strategy.md) for scaling considerations

---

## 1. Infrastructure Topology

```
┌──────────────────────────────────────────────┐
│              Vercel Edge Network              │
│  ┌────────────────────────────────────────┐  │
│  │        Next.js 16 (apps/web)           │  │
│  │  SSR + Static + Server Actions         │  │
│  └────────────────┬───────────────────────┘  │
└───────────────────┼──────────────────────────┘
                    │ HTTPS
                    ▼
┌──────────────────────────────────────────────┐
│           Docker Host (VPS/Cloud)             │
│                                              │
│  ┌─────────────┐  ┌────────┐  ┌──────────┐  │
│  │  linky-api  │  │ Redis  │  │  Ollama  │  │
│  │  (Express)  │  │ 8-alp  │  │  nomic   │  │
│  │  port 7270  │  │        │  │  v1.5    │  │
│  └──────┬──────┘  └────────┘  └──────────┘  │
│         │         linky-network              │
└─────────┼────────────────────────────────────┘
          │
    ┌─────┼──────────────────┐
    │     │                  │
    ▼     ▼                  ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│Supabase│ │ MQTT     │ │ AWS S3   │
│(Postgres│ │ Broker   │ │          │
│+pgvec) │ │(External)│ │          │
└────────┘ └──────────┘ └──────────┘
```

---

## 2. Docker Configuration

### 2.1 Dockerfile (API)

Location: `Dockerfile` (root)

Multi-stage build:

**Stage 1: base**
- `node:25-bookworm-slim`
- Installs pnpm globally

**Stage 2: builder**
- Copies workspace structure (only api and its dependencies)
- `pnpm install --frozen-lockfile`
- Builds `@ws/logger` and `@ws/api`

**Stage 3: runner**
- `NODE_ENV=production`
- Copies only built artifacts and package files
- `pnpm install --prod --frozen-lockfile`
- Entry: `node --import=./dist/instrument.js ./dist/index.js`

### 2.2 Docker Compose

Location: `docker-compose.yml`

Three services on `linky-network` (external):

#### api (linky-api)
- Image: `mewthedev/linky-api:latest`
- Port: `7270:7270`
- Environment: `NODE_ENV=production`, `REDIS_URL`, `OLLAMA_URL`
- Health check: `node dist/healthcheck.js` (30s interval, 5s timeout, 3 retries, 10s start period)
- Depends on: redis (healthy), ollama (healthy)
- Env file: `.env`
- Restart: `unless-stopped`

#### redis (linky-redis)
- Image: `redis:8-alpine`
- Health check: `redis-cli ping` (5s interval, 3s timeout, 20 retries)
- Volume: `redis-data:/data`
- Restart: `unless-stopped`

#### ollama (linky-ollama)
- Image: `mewthedev/ollama-nomic-1.5:latest` (pre-loaded with nomic-embed-text:v1.5)
- Health check: `ollama --version && ollama ps` (1m30s interval, 30s timeout, 5 retries, 30s start)
- Volume: `ollama-data:/root/.ollama`
- Restart: `unless-stopped`

### 2.3 Network

- External Docker network: `linky-network`
- All services communicate within this network
- Redis and Ollama are not exposed to the host (only accessible from within the network)

---

## 3. Frontend Deployment (Vercel)

### 3.1 Platform

Next.js 16 deployed on Vercel with:
- Server-Side Rendering (SSR)
- Static generation for marketing pages
- Server Actions for mutations
- Edge middleware for auth (Clerk)
- Automatic HTTPS and CDN

### 3.2 Environment Variables

Frontend environment variables are configured in Vercel:
- `NEXT_PUBLIC_API_URL` -- Backend API URL
- `NEXT_PUBLIC_MQTT_*` -- MQTT broker configuration
- Clerk keys for authentication
- Sentry DSN for monitoring

---

## 4. Deployment Flow

### 4.1 Backend Deployment

```
1. Build Docker image:
   docker build -t mewthedev/linky-api:latest .

2. Push to registry:
   docker push mewthedev/linky-api:latest

3. On target host:
   docker compose pull
   docker compose up -d

4. Health check passes → traffic routed
```

### 4.2 Frontend Deployment

```
1. Push to main branch (or deploy branch)
2. Vercel auto-detects Next.js
3. Builds and deploys
4. Serverless functions created for SSR/API routes
5. Static assets cached at edge
```

---

## 5. Service Dependencies and Startup Order

```
Redis (health: ping) ──┐
                        ├──→ API (health: healthcheck.js)
Ollama (health: ps) ───┘
```

The API service waits for both Redis and Ollama to be healthy before starting.

External dependencies (no Docker orchestration):
- Supabase (Postgres) -- Must be available at startup
- MQTT Broker -- Required for presence; failure is non-fatal
- Clerk -- Required for authentication
- AWS S3 -- Required for media operations
- Cloudflare TURN -- Required for WebRTC NAT traversal

---

## 6. Graceful Shutdown

On SIGTERM or SIGINT:
1. Stop accepting new HTTP connections
2. Close Socket.IO connections
3. Close Redis connection
4. Close MQTT connection
5. Flush Sentry events (2s timeout)
6. Exit process

Shutdown timeout: 30s (configurable via `SHUTDOWN_TIMEOUT`). Force exit after timeout.

---

## Related Components

- Observability: [16-observability.md](16-observability.md)
- Scalability: [19-scalability-strategy.md](19-scalability-strategy.md)

## Risk Considerations

- Single API container; no built-in load balancing or failover
- Redis data is volume-mounted but not replicated
- Ollama requires sufficient memory for embedding model
- External network (`linky-network`) must be created manually before `docker compose up`
- No automated database migration step in deployment pipeline
- No blue-green or canary deployment strategy documented
- Frontend and backend must be deployed in coordination for breaking API changes
