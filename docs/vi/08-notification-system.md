# 08 -- Hệ thống thông báo

## Mục đích

Mô tả hạ tầng thông báo: thông báo lưu trữ, gửi qua socket thời gian thực, Web Push, presence MQTT và ma trận quyết định push vs socket.

## Phạm vi

Domain notification, dịch vụ push, client MQTT presence, context thông báo hành động peer.

## Phụ thuộc

- [02-architecture.md](02-architecture.md), [03-authentication.md](03-authentication.md)

---

## 1. Luồng thông báo

createNotification(userId, type, payload): (1) ghi DB notifications; (2) thử gửi qua socket (getSocketByUserId, emit "notification:new"); (3) nếu không gửi được socket thì sendPushToUser (lấy subscriptions, gửi Web Push, xử lý 410 xóa subscription).

---

## 2. Loại thông báo

favorite_added, level_up, streak_milestone, streak_expiring, admin_broadcast (title/body/url từ payload).

---

## 3. Socket và Push

Sự kiện socket: notification:new, notification:read, notification:all-read. Push: VAPID, payload có title, body, icon, badge, data.url, data.notificationId. sendPushOnly cho thông báo thoáng qua (không lưu DB), dùng cho match found.

---

## 4. Peer action và visibility

sendPeerActionPush: nếu peerSocket.data.visibility === "foreground" thì không gửi push; nếu background/unknown thì gửi push-only với onlyWhenBlurred. Dùng khi match found hoặc favorite added trong cuộc gọi.

---

## 5. MQTT presence

Client MQTT (WSS): clientId = userId. Kết nối: publish presence/{userId} state "online". LWT: state "offline" khi ngắt bất thường. Retain: true.

---

## Ma trận Push vs Socket

User kết nối, tab focus → chỉ socket. User kết nối, tab background → socket + push. User ngắt → chỉ push. Không có subscription push → chỉ lưu DB.

---

## Thành phần liên quan

[04-video-chat-system.md](04-video-chat-system.md), [13-socket-events-map.md](13-socket-events-map.md), [09-admin-system.md](09-admin-system.md).

## Rủi ro

Broker MQTT ngoài; sự cố thì mất presence. Web Push best-effort. Chỉ 410 mới xóa subscription; subscription lỗi khác tích tụ. NotificationContext phải được khởi tạo đúng.
