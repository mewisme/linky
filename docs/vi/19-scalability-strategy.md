# 19 -- Chiến lược mở rộng

## Mục đích

Mô tả kiến trúc mở rộng và chiến lược scale ngang: hybrid Redis/in-memory, giới hạn thành phần có trạng thái, đường scaling khuyến nghị.

## Phạm vi

Đặc tính scalability hiện tại, nút thắt và quyết định Redis vs in-memory matchmaking.

## Phụ thuộc

- [17-deployment.md](17-deployment.md), [18-performance-strategy.md](18-performance-strategy.md)

---

## 1. Kiến trúc hiện tại: một server

Thành phần stateless (scale ngang được): HTTP handler, truy vấn DB, thao tác cache, webhook. Thành phần có trạng thái: RoomService (Map in-memory), hàng đợi matchmaking (chế độ Memory), match lock (boolean), NotificationContext (socket lookup). Tất cả trạng thái theo instance.

---

## 2. Hybrid matchmaking

MatchStateStore: MemoryMatchStateStore (USE_REDIS_MATCHMAKING=false) hoặc RedisMatchStateStore (true). Redis cho phép hàng đợi dùng chung nhiều instance. Vẫn còn: phòng in-memory (cặp ghép xong phải cùng server), khóa match in-process, gửi sự kiện socket theo server.

---

## 3. Đường scaling

Phase 1: một server, in-memory (hiện tại). Phase 2: bật Redis matchmaking (đã có). Phase 3 (chưa làm): Socket.IO Redis Adapter, trạng thái phòng trên Redis, khóa match phân tán (Redis SET NX), load balancer sticky, NotificationContext dùng adapter. Phase 4: nhiều Ollama, Redis cluster, read replica DB, CDN media.

---

## 4. Nút thắt

Matchmaking: O(n^2) n=50, load embedding từ Supabase mỗi chu kỳ. DB: ghi qua Supabase; RPC serialize. Ollama: một instance, timeout 60s. Socket.IO: một namespace, heartbeat lặp mọi phòng 4s.

---

## 5. Redis không khả dụng

Cache: fail-through DB. Rate limit: bỏ qua. Admin role: fallback DB. Matchmaking (chế độ Redis): không có fallback in-memory khi Redis lỗi.

---

## Thành phần liên quan

[17-deployment.md](17-deployment.md), [18-performance-strategy.md](18-performance-strategy.md), [10-caching-architecture.md](10-caching-architecture.md).

## Rủi ro

Một server là điểm lỗi đơn. Chưa failover hay định tuyến theo health. Matchmaking Redis không kèm trạng thái phòng phân tán là giải pháp nửa vời. Chưa tích hợp Socket.IO Redis adapter. Ollama một instance, không dự phòng.
