# 10 -- Kiến trúc cache

## Mục đích

Mô tả kiến trúc cache: mô hình cache-aside Redis, namespace khóa, chính sách TTL, quy tắc vô hiệu hóa và timeout.

## Phạm vi

Backend Redis (apps/api/src/infra/redis/), tag cache frontend Next.js (apps/web/src/lib/cache/tags.ts).

## Phụ thuộc

- [02-architecture.md](02-architecture.md)

---

## 1. Cache-Aside

Redis chỉ tối ưu đọc; DB là nguồn chân lý. getOrSet: thử GET Redis (có timeout), miss hoặc lỗi thì fetchFromDb(), SET Redis (lỗi chỉ log). invalidate(key), invalidateByPrefix(prefix) dùng SCAN + batch DEL. Mọi thao tác Redis bọc withRedisTimeout (mặc định 5s); lỗi cache không rethrow.

---

## 2. Khóa và TTL

Redis keys: user:profile:{userId}, user:progress:{userId}:{tz}, user:streak:calendar:..., user:exp_today:..., user:blocks:..., admin:{resource}:{hash}, ref:interest-tags, ref:changelogs, user:details/settings/favorites/reports/call-history, call-history:item:{id}. Namespace: linky:{CACHE_NAMESPACE_VERSION}:... TTL: profile 10 phút, progress 45s, streak calendar hiện tại 90s/quá khứ 24h, blocks 30 phút, admin list 60s, reference data 24h, user data 15 phút. Admin role: 5 phút.

---

## 3. Vô hiệu hóa

Profile: webhook user updated/created. Progress: kết thúc cuộc gọi, streak. Streak calendar: cập nhật streak (tháng hiện tại). Admin: mọi ghi admin. User deleted: prefix admin:users:.

---

## 4. Frontend

Next.js unstable_cache với tag; revalidateTag sau mutation. Tag: user-profile, user-progress, favorites, call-history, reports-me, notifications, matchmaking, admin-*...

---

## Thành phần liên quan

[18-performance-strategy.md](18-performance-strategy.md), [17-deployment.md](17-deployment.md), [11-security-model.md](11-security-model.md).

## Rủi ro

Lỗi Redis được nuốt; cần giám sát. Invalidate theo prefix O(n). Hai lớp cache (Redis + Next.js) cần invalidation đồng bộ.
