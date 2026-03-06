# 18 -- Chiến lược hiệu năng

## Mục đích

Mô tả chiến lược tối ưu hiệu năng: lớp cache, tối ưu truy vấn, tuning real-time và bundle frontend.

## Phạm vi

Cache backend, pattern truy vấn DB, tuning Socket.IO và chiến lược render frontend.

## Phụ thuộc

- [10-caching-architecture.md](10-caching-architecture.md), [17-deployment.md](17-deployment.md)

---

## 1. Hai lớp cache

Redis (backend): cache-aside, timeout 5s, thoái lui khi lỗi. Next.js (frontend): unstable_cache + tag revalidation. Luồng: request → cache Next (hit?) → serverFetch → cache Redis (hit?) → DB → ghi Redis → trả về → ghi Next cache.

---

## 2. Truy vấn DB

Truy vấn đọc nặng cache Redis. Thao tác kinh tế qua RPC (một round-trip, transaction). Matchmaking load song song interests, favorites, blocks, embeddings. View DB pre-join: admin_users_unified, public_user_info, changelogs_with_creator.

---

## 3. Real-time

Chu kỳ match 1s; cleanup 30s; tối đa 50 candidate. Heartbeat phòng 4s. Socket.IO: WebSocket only, buffer 8MB, reconnect 5 lần 1s.

---

## 4. Embedding và frontend

Embedding: so sánh source hash tránh gọi Ollama thừa; setImmediate không chặn request. Frontend: server component fetch, client component tương tác; withSentryQuery cache theo user; socket manager singleton.

---

## Thành phần liên quan

[10-caching-architecture.md](10-caching-architecture.md), [19-scalability-strategy.md](19-scalability-strategy.md), [17-deployment.md](17-deployment.md).

## Rủi ro

Hai lớp cache có thể stale nếu invalidation không đồng bộ. RPC chuyển độ phức tạp sang DB. Khóa match O(n^2) giới hạn kích thước hàng thực tế.
