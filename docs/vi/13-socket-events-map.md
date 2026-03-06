# 13 -- Bản đồ sự kiện Socket

## Mục đích

Danh mục đầy đủ sự kiện Socket.IO: namespace, tên sự kiện, hướng, payload và điều kiện kích hoạt.

## Phạm vi

Mọi sự kiện Socket.IO thuộc /chat và /admin.

## Phụ thuộc

- [04-video-chat-system.md](04-video-chat-system.md), [05-matchmaking.md](05-matchmaking.md)

---

## Namespace /chat

Client→Server: message, join-room, leave-room, client:visibility:foreground/background, join, signal, skip, end-call, chat:message:send, chat:typing, mute-toggle, video-toggle, screen-share-toggle, reaction, favorite:notify-peer, resync-session. Server→Client: message, user-joined, user-left, joined-queue, matched (roomId, peerId, isOfferer, peerInfo, myInfo), dequeued, queue-timeout, signal, skipped, peer-skipped, end-call, peer-left, room-ping, chat:message, chat:typing, chat:error, mute-toggle, video-toggle, screen-share-toggle, reaction, favorite:peer-event, resync-state, notification:new, notification:read, notification:all-read, error.

---

## Namespace /admin

Yêu cầu socketAuthMiddleware + adminNamespaceAuthMiddleware. Dùng cho cập nhật real-time bảng điều khiển admin.

---

## Vòng đời kết nối

Kết nối /chat với auth.token → socketAuthMiddleware verify JWT → gắn socket.data (userId, userName, userImageUrl) → sự kiện "connection" → đăng ký toàn bộ handler.

---

## Thành phần liên quan

[04-video-chat-system.md](04-video-chat-system.md), [05-matchmaking.md](05-matchmaking.md), [08-notification-system.md](08-notification-system.md).

## Rủi ro

Không version payload; thay đổi breaking cần triển khai đồng bộ client/server. Một số sự kiện có rate limit, một số không. Thứ tự tin nhắn đảm bảo theo từng socket, không giữa các socket.
