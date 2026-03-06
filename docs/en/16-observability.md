# 16 -- Observability

## Purpose

This document describes the observability infrastructure of the Linky platform, including error tracking, performance monitoring, structured logging, and telemetry.

## Scope

Covers Sentry integration (backend and frontend), Pino logging (backend), and telemetry event tracking (frontend).

## Dependencies

- [02-architecture.md](02-architecture.md) for system architecture

## Cross References

- [17-deployment.md](17-deployment.md) for deployment monitoring
- [15-server-actions.md](15-server-actions.md) for Sentry action instrumentation

---

## 1. Sentry Integration

### 1.1 Backend (Express.js)

- Package: `@sentry/node`
- Initialization: `apps/api/src/instrument.ts` (imported via `--import` flag in production)
- Node.js entry: `CMD ["--import=./dist/instrument.js", "./dist/index.js"]`

Capabilities:
- Automatic Express middleware instrumentation
- Error capturing with full stack traces
- Performance monitoring (transactions and spans)
- Graceful flush on shutdown (`Sentry.close(2000)`)

### 1.2 Frontend (Next.js)

- Package: `@sentry/nextjs`
- Integration with Next.js App Router

Capabilities:
- Server action instrumentation via `withSentryAction` and `withSentryQuery`
- Client-side error boundary integration
- Performance monitoring for page loads and navigations
- Sentry logger for structured client-side logging (`Sentry.logger.info/warn/error`)
- Metrics counters (`Sentry.metrics.count`)

---

## 2. Pino Logging (Backend)

### 2.1 Package

`@ws/logger` -- Shared workspace package providing Pino-based structured logging.

### 2.2 Logger Creation

```typescript
import { createLogger } from "@/utils/logger.js";
const logger = createLogger("namespace:component");
```

Each logger instance is tagged with a namespace for filtering and aggregation.

### 2.3 Log Levels

| Level | Usage |
|-------|-------|
| `fatal` | Uncaught exceptions, unhandled rejections |
| `error` | Operation failures, database errors, auth failures |
| `warn` | Degraded operations (cache miss, timeout, push failure) |
| `info` | Significant events (user actions, matches, level ups) |
| `debug` | Detailed flow information (queue states, score breakdowns) |

### 2.4 Logging Convention

The Pino merging object pattern is used:
```typescript
logger.error(error, "Failed to process request for user %s", userId);
logger.info("Match created: %s <-> %s score=%d", userA, userB, score);
logger.warn(error, "Cache read failed for key %s", cacheKey);
```

The error or context object is always the first argument, followed by the message template and interpolation values.

### 2.5 Logger Namespaces (Subset)

| Namespace | Component |
|-----------|-----------|
| `middleware:clerk` | Clerk authentication middleware |
| `middleware:admin` | Admin authorization middleware |
| `middleware:rate-limit` | Rate limiting middleware |
| `middleware:graceful-shutdown` | Shutdown handler |
| `socket:auth` | Socket.IO authentication |
| `api:matchmaking:service` | Matchmaking service |
| `api:video-chat:rooms:service` | Room management |
| `api:video-chat:matchmaking:socket` | Matchmaking socket handlers |
| `api:user:level:service` | Level/EXP service |
| `api:user:streak:service` | Streak service |
| `api:notification:service:notification` | Notification service |
| `api:notification:service:push` | Push notification service |
| `infra:redis:cache` | Redis cache operations |
| `infra:redis:timeout-wrapper` | Redis timeout wrapper |
| `infra:ollama:embedding:service` | Ollama embedding service |
| `infra:admin-cache` | Admin role cache |
| `economy:service:*` | Economy domain services |
| `contexts:economy-stabilizer` | Economy stabilizer |
| `webhook:clerk` | Clerk webhook handler |

---

## 3. Frontend Telemetry

### 3.1 Event Tracking

Location: `apps/web/src/lib/telemetry/`

- `events/client.ts` -- Client-side analytics events
- `events/server.ts` -- Server-side analytics events
- `op.ts` -- Operation name constants

### 3.2 Sentry Logger (Client)

The frontend uses `Sentry.logger` for structured logging:
```typescript
Sentry.logger.info("Connected to MQTT broker");
Sentry.logger.warn("Attempted to update socket with null token");
Sentry.logger.error("MQTT client error", { error });
```

---

## 4. Health Monitoring

### 4.1 Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Container health check (Docker) |
| `GET /health` | Application health status |

### 4.2 Docker Health Check

```yaml
healthcheck:
  test: ["CMD-SHELL", "node dist/healthcheck.js"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

### 4.3 Socket.IO Health

Location: `apps/web/src/lib/realtime/socket-health.ts`

Client-side socket health monitoring for connection state tracking.

### 4.4 Backend Restart Detection

Location: `apps/web/src/lib/realtime/backend-restart-detector.ts`

Detects backend restarts from the frontend and triggers appropriate reconnection logic.

---

## Related Components

- Deployment: [17-deployment.md](17-deployment.md)
- Performance: [18-performance-strategy.md](18-performance-strategy.md)

## Risk Considerations

- Sentry event volume may exceed plan limits under high traffic
- Pino logs are written to stdout; log aggregation depends on container runtime configuration
- No centralized log storage solution is documented
- Frontend telemetry depends on Sentry SDK availability; ad blockers may interfere
- No alerting rules are defined in the codebase (assumed to be configured in Sentry dashboard)
