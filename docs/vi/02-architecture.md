# 02 -- Kiến trúc hệ thống

## Mục đích

Mô tả kiến trúc hệ thống đầy đủ của nền tảng Linky: mô hình domain-driven backend, kiến trúc phân lớp frontend, luồng dữ liệu và chiến lược render server/client lai.

## Phạm vi

Bao gồm ranh giới lớp, quy tắc phụ thuộc và luồng dữ liệu cho backend và frontend.

## Phụ thuộc

- [01-overview.md](01-overview.md) cho ngữ cảnh công nghệ

## Tham chiếu chéo

- [10-caching-architecture.md](10-caching-architecture.md), [12-database-schema.md](12-database-schema.md), [17-deployment.md](17-deployment.md)

---

## 1. Kiến trúc tổng quan

Client (trình duyệt) kết nối qua HTTPS tới Next.js/Vercel và qua WSS tới Express + Socket.IO; MQTT dùng cho presence. Backend giao tiếp với Supabase, Redis, Ollama, S3.

---

## 2. Kiến trúc Backend

### 2.1 Mô hình lớp

Lớp Routes → Middleware → Contexts (điều phối đa domain) → Các domain (http, service, socket, types) → Hạ tầng (Redis, Supabase, S3, MQTT, Clerk, Ollama, Push).

### 2.2 Quy tắc cô lập domain

**Bất biến: Các domain không được import lẫn nhau.** Điều phối đa domain chỉ thực hiện qua lớp `contexts/`.

### 2.3 Các domain chính

user, video-chat, matchmaking, reports, admin, embeddings, notification, economy, economy-shop, economy-boost, economy-daily, economy-weekly, economy-monthly, economy-season, economy-prestige.

### 2.4 Hạ tầng

`infra/`: redis (cache, timeout), supabase (repository), s3, clerk, ollama, mqtt, push, admin-cache.

### 2.5 Thành phần route

Sau middleware Clerk: `/api/v1/users/*`, `/api/v1/call-history`, `/api/v1/reports`, `/api/v1/favorites`, `/api/v1/video-chat`, `/api/v1/notifications`, `/api/v1/push`, `/api/v1/economy/*`, `/api/v1/s3`, `/api/ice-servers`. Sau middleware admin: `/api/v1/admin/*`.

---

## 3. Kiến trúc Frontend

Lớp: app → features → entities → shared → lib (phụ thuộc hướng vào trong). Trang: server component fetch dữ liệu, component client (`*-client.tsx`) xử lý tương tác. State: Zustand, TanStack React Query, cache Next.js, Socket.IO, MQTT.

---

## 4. Luồng dữ liệu chính

Yêu cầu API có xác thực: Browser → Next.js (auth, getToken) → serverFetch → Express (clerkMiddleware) → Route → Service → Repository/Cache → JSON. Socket: Browser → Socket.IO /chat hoặc /admin → socketAuthMiddleware (JWT) → [admin: adminNamespaceAuthMiddleware] → đăng ký handler.

---

## 5. Đồng thời và xử lý điều kiện đua

Matchmaking dùng khóa in-process (matchLock); chỉ một chu kỳ tryMatch chạy mỗi instance. Giao dịch kinh tế thực hiện trong RPC Postgres (nguyên tử). Cache: ghi DB rồi vô hiệu hóa cache. Socket.IO đảm bảo thứ tự tin nhắn theo kết nối.

---

## Thành phần liên quan

[10-caching-architecture.md](10-caching-architecture.md), [12-database-schema.md](12-database-schema.md), [13-socket-events-map.md](13-socket-events-map.md), [14-api-contracts.md](14-api-contracts.md).

## Rủi ro

Khóa matchmaking in-process không đồng bộ giữa nhiều instance. Trạng thái phòng chỉ trong bộ nhớ; khởi động lại server mất phòng đang hoạt động. Quy tắc cô lập domain cần tuân thủ thủ công.
