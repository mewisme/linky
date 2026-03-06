# 16 -- Quan sát hệ thống

## Mục đích

Mô tả hạ tầng quan sát: theo dõi lỗi, hiệu năng, ghi log cấu trúc và telemetry.

## Phạm vi

Sentry (backend + frontend), Pino (backend), telemetry frontend.

## Phụ thuộc

- [02-architecture.md](02-architecture.md)

---

## 1. Sentry

Backend: @sentry/node, khởi tạo qua --import instrument.js; middleware Express, capture lỗi, performance. Tắt máy: Sentry.close(2000). Frontend: @sentry/nextjs; withSentryAction/withSentryQuery; Sentry.logger, Sentry.metrics.count.

---

## 2. Pino (backend)

createLogger("namespace:component"). Cấp: fatal (uncaught), error, warn, info, debug. Quy ước: merging object đầu tiên (error/context), sau đó message và tham số. Namespace ví dụ: middleware:clerk, socket:auth, api:matchmaking:service, infra:redis:cache, economy:service:*, webhook:clerk.

---

## 3. Telemetry và health

Frontend: lib/telemetry/events (client, server), op.ts. Health: GET /healthz, /health. Docker healthcheck: node dist/healthcheck.js. Client: socket-health, backend-restart-detector.

---

## Thành phần liên quan

[17-deployment.md](17-deployment.md), [18-performance-strategy.md](18-performance-strategy.md).

## Rủi ro

Khối lượng sự kiện Sentry có thể vượt hạn mức. Log Pino ra stdout; tổng hợp log phụ thuộc runtime. Không có kho log tập trung được mô tả. Không có quy tắc cảnh báo trong code (cấu hình trên Sentry).
