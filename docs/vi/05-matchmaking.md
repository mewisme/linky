# 05 -- Hệ thống ghép cặp

## Mục đích

Mô tả động cơ ghép cặp: quản lý hàng đợi, thuật toán chấm điểm, tích hợp tương đồng embedding, abstraction kho trạng thái (Redis / bộ nhớ).

## Phạm vi

Domain matchmaking: MatchmakingService, RedisMatchStateStore, MemoryMatchStateStore, scoring, embedding score.

## Phụ thuộc

- [02-architecture.md](02-architecture.md), [06-embedding-system.md](06-embedding-system.md)

---

## 1. Kiến trúc

MatchmakingService dùng MatchStateStore (interface). Cấu hình USE_REDIS_MATCHMAKING: true → RedisMatchStateStore, false → MemoryMatchStateStore. Cả hai cung cấp: enqueue/dequeue, cache dữ liệu user (interests, favorites, blocks), skip cooldown, kiểm tra quyền sở hữu hàng đợi.

---

## 2. Hàng đợi và chu kỳ ghép cặp

Enqueue: xác thực socket, resolve DB user ID, cache user data nếu chưa có, enqueueUser. Dequeue khi: matched, end-call, skip, cleanup stale (socket mất), timeout 5 phút (emit queue-timeout). Chu kỳ tryMatch mỗi 1 giây: khóa in-process, lấy tối đa 50 user, load song song interests/favorites/blocks/embeddings, tính điểm từng cặp, lọc blocked, ưu tiên cặp không skip cooldown, sắp xếp theo favoriteType > commonInterests > score, chọn cặp tốt nhất, dequeue cả hai, trả về cặp socket. Cleanup mỗi 30s: stale socket, entry quá 5 phút.

---

## 3. Thuật toán chấm điểm

Điểm: commonInterests*100 + bonus cả hai có tag (50) + fairnessBonus (min(avgWaitSec*0.1, 20)) + embeddingScore (similarity*25 nếu >= 0.3) + favorite (mutual +10000, one-way +5000). Cặp bị block loại hẳn. So sánh: favoriteType > commonInterests > score.

---

## 4. Skip cooldown và queue status

recordSkip(skipper, skipped) lưu cặp skip; cặp có cooldown bị đẩy xuống nhóm fallback. GET /api/v1/matchmaking/queue-status (public) trả về queueSize, estimatedWaitSeconds (hiện luôn null).

---

## Thành phần liên quan

[06-embedding-system.md](06-embedding-system.md), [04-video-chat-system.md](04-video-chat-system.md), [12-database-schema.md](12-database-schema.md).

## Rủi ro

Khóa matchLock chỉ trong một process. Tối đa 50 user mỗi chu kỳ; cặp O(n^2). Embedding load từ Supabase mỗi chu kỳ có thể thành nút thắt. Timeout 5 phút hardcode.
