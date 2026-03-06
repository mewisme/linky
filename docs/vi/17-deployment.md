# 17 -- Triển khai

## Mục đích

Mô tả kiến trúc triển khai: Docker, Vercel, topology hạ tầng và cấu hình production.

## Phạm vi

Dockerfile, docker-compose.yml, triển khai frontend Vercel, phụ thuộc hạ tầng.

## Phụ thuộc

- [01-overview.md](01-overview.md)

---

## 1. Topology

Vercel: Next.js (SSR, Server Actions). Docker host: container linky-api (Express, port 7270), linky-redis (Redis 8-alpine), linky-ollama (nomic 1.5); mạng linky-network. Ngoài: Supabase, MQTT broker, AWS S3, Clerk, Cloudflare TURN.

---

## 2. Docker

Dockerfile multi-stage: base (node 25, pnpm) → builder (copy api + deps, pnpm install, build logger + api) → runner (copy artifact, pnpm prod, CMD node --import=dist/instrument.js dist/index.js). docker-compose: api (image mewthedev/linky-api:latest, healthcheck node dist/healthcheck.js, depends_on redis + ollama healthy), redis (redis:8-alpine, volume redis-data), ollama (mewthedev/ollama-nomic-1.5, volume ollama-data). Network external: linky-network.

---

## 3. Frontend (Vercel)

Next.js 16 trên Vercel; SSR, static, Server Actions; biến môi trường NEXT_PUBLIC_*, Clerk, Sentry.

---

## 4. Khởi động và tắt máy

API chờ Redis và Ollama healthy. Graceful shutdown: đóng HTTP, Socket.IO, Redis, MQTT, Sentry.close(2000); timeout 30s (SHUTDOWN_TIMEOUT).

---

## Thành phần liên quan

[16-observability.md](16-observability.md), [19-scalability-strategy.md](19-scalability-strategy.md).

## Rủi ro

Một container API; không load balancing/failover. Redis một volume, không replicate. Ollama cần đủ bộ nhớ. Mạng linky-network tạo thủ công. Không bước migration DB trong pipeline. Frontend và backend cần triển khai đồng bộ khi API đổi breaking.
