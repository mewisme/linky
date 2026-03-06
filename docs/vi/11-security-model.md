# 11 -- Mô hình bảo mật

## Mục đích

Mô tả bảo mật: xác thực, phân quyền, rate limiting, CORS, kiểm tra đầu vào, chống lạm dụng và bảo vệ dữ liệu.

## Phạm vi

Mọi thành phần liên quan bảo mật backend và frontend.

## Phụ thuộc

- [03-authentication.md](03-authentication.md), [10-caching-architecture.md](10-caching-architecture.md)

---

## 1. Xác thực

JWT Clerk verify bằng CLERK_SECRET_KEY; sub là Clerk user ID. HTTP: header Authorization Bearer. Socket: handshake.auth.token hoặc query.token. Webhook: chữ ký Svix với CLERK_WEBHOOK_SECRET.

---

## 2. Phân quyền

Route public: health, webhook, interest-tags, changelogs, queue-status. Route cần auth: toàn bộ /api/v1/* (trừ trên). Route admin: /api/v1/admin/* cần thêm adminMiddleware (Redis cache role, fallback DB). User chỉ truy cập dữ liệu của chính mình (req.auth.sub).

---

## 3. Rate limiting

Redis: key rate-limit:{identifier}, identifier = auth.sub hoặc ip. Cửa sổ và max request cấu hình (mặc định 30s, 100). Trả về 429 khi vượt; header X-RateLimit-*. Redis không khả dụng thì bỏ qua rate limit (fail-open).

---

## 4. Chống lạm dụng

Chặn user (block) loại khỏi ghép cặp. Báo cáo (reports) vòng đời pending→reviewed→resolved/dismissed. Skip cooldown tránh ghép lại cặp vừa skip. Timeout hàng đợi 5 phút. Cleanup socket chết mỗi 30s. Email automation test: webhook xóa user Clerk.

---

## 5. Bảo vệ dữ liệu

Xóa user luôn soft delete. Service role Supabase bỏ qua RLS; phân quyền ở tầng ứng dụng. Bí mật chỉ từ biến môi trường.

---

## Thành phần liên quan

[03-authentication.md](03-authentication.md), [09-admin-system.md](09-admin-system.md), [14-api-contracts.md](14-api-contracts.md).

## Rủi ro

Service role lộ thì toàn bộ DB bị đe dọa. Rate limit fail-open khi Redis sự cố. MQTT dùng credential chung. Không quét nội dung chat/media. Thay đổi vai trò admin trễ tối đa 5 phút.
