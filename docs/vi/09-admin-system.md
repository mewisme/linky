# 09 -- Hệ thống quản trị

## Mục đích

Mô tả hệ thống quản trị: mô hình vai trò admin, CRUD toàn bộ tài nguyên, công cụ kinh tế, broadcast và ma trận quyền.

## Phạm vi

Domain admin, middleware admin, namespace socket /admin, mọi route HTTP admin.

## Phụ thuộc

- [03-authentication.md](03-authentication.md), [07-economy-system.md](07-economy-system.md)

---

## 1. Vai trò Admin

user (0), admin (1), superadmin (2). Lưu users.role; cache Redis admin:role:{clerkUserId} TTL 5 phút. Khởi động: initializeAdminCache() preload.

---

## 2. Cấu trúc route Admin

Tất cả dưới /api/v1/admin/, bảo vệ clerkMiddleware + adminMiddleware. Tài nguyên: users, reports, changelogs, interest-tags (soft/hard delete, import), broadcasts, level-rewards, level-feature-unlocks, favorite-exp-boost, streak-exp-bonuses, seasons (force-decay), economy/stats, economy/simulate, embeddings (compare, similar, sync, sync-all), config (key-value), media (presigned upload).

---

## 3. Soft delete vs Hard delete

User: chỉ soft delete. Interest tags: soft + hard (superadmin). Changelogs, level rewards, feature unlocks, streak/favorite rules: hard delete (admin). Reports: theo trạng thái, không xóa bản ghi.

---

## 4. Broadcast và Economy Config

Broadcast: ghi broadcast_history, tạo notification cho từng user đích (socket/push). Economy config: bảng economy_config; các key stabilization_enabled, conversion_bonus_multiplier, cosmetic_price_multiplier, seasonal_decay_rate, avg_coin_per_user_cap.

---

## 5. Ma trận quyền

Admin: toàn bộ CRUD, economy, broadcast, embeddings, config. Superadmin: thêm đổi vai trò user, hard delete interest tags. Phân biệt chủ yếu enforce phía frontend (isSuperAdmin).

---

## Thành phần liên quan

[03-authentication.md](03-authentication.md), [07-economy-system.md](07-economy-system.md), [11-security-model.md](11-security-model.md), [12-database-schema.md](12-database-schema.md).

## Rủi ro

Phân quyền admin/superadmin một phần do frontend; backend coi cả hai là authorized. Cache vai trò 5 phút. Broadcast gửi tuần tự theo user; số user lớn có thể timeout.
