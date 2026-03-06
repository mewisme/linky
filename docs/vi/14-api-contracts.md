# 14 -- Hợp đồng API

## Mục đích

Danh mục endpoint HTTP: method, path, yêu cầu xác thực, hình dạng request/response và mã lỗi.

## Phạm vi

Mọi handler route Express.js.

## Phụ thuộc

- [03-authentication.md](03-authentication.md), [02-architecture.md](02-architecture.md)

---

## Endpoint công khai (không auth)

GET /, /healthz, /health, /api. GET /api/v1/interest-tags, /api/v1/changelogs, /api/v1/matchmaking/queue-status. POST /webhook (chữ ký Svix).

---

## Endpoint người dùng (Clerk auth)

Users: GET/PUT/PATCH /api/v1/users/me, profile/me, details/me, settings/me, level/me, progress/me, streak/me, streak/me/history, streak/calendar, blocks, blocks/me; POST/DELETE blocks/:userId; interest-tags (me, all); POST /users/prestige. Economy: POST economy/convert; GET daily/progress, weekly/progress, monthly/progress; POST weekly/checkin, monthly/checkin, monthly/buyback; GET/POST economy/shop; POST economy/boost/purchase. Tài nguyên: call-history (GET list, GET :id), favorites (GET, POST, DELETE :userId), reports (GET me, POST), video-chat/end-call-unload (POST). Notifications: GET me, me/unread-count; POST read-all, :id/read. Push: POST subscribe, unsubscribe; GET vapid-public-key. Media: GET api/ice-servers; POST api/v1/s3 (presigned).

---

## Endpoint Admin (Clerk + Admin)

Tất cả dưới /api/v1/admin/: users, reports, changelogs, interest-tags, broadcasts, level-rewards, level-feature-unlocks, favorite-exp-boost, streak-exp-bonuses, seasons, economy/stats, economy/simulate, embeddings, config, media. Chi tiết từng resource xem [09-admin-system.md](09-admin-system.md).

---

## Định dạng lỗi

{ error: "ErrorType", message: "mô tả" }. Mã HTTP: 400, 401, 403, 404, 429, 500. Mã lỗi theo domain: INSUFFICIENT_EXP, INVALID_AMOUNT, ITEM_NOT_FOUND, ALREADY_OWNED, INSUFFICIENT_COINS, ALREADY_CLAIMED, PRESTIGE_THRESHOLD_NOT_MET, ACTIVE_SEASON_EXISTS, v.v.

---

## Thành phần liên quan

[15-server-actions.md](15-server-actions.md), [03-authentication.md](03-authentication.md), [12-database-schema.md](12-database-schema.md).

## Rủi ro

Không version API ngoài prefix /v1. Không có đặc tả OpenAPI/Swagger. Phân trang không thống nhất (limit/offset vs cursor).
