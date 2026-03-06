# 04 -- Hệ thống video chat

## Mục đích

Mô tả hệ thống video chat: signaling WebRTC, quản lý phòng, vòng đời cuộc gọi, tin nhắn chat trong cuộc gọi, điều khiển media và ghi lịch sử cuộc gọi kèm tác dụng phụ tiến độ.

## Phạm vi

Domain video-chat, handler sự kiện Socket.IO, dịch vụ phòng, dịch vụ lịch sử cuộc gọi, endpoint end-call-unload HTTP.

## Phụ thuộc

- [02-architecture.md](02-architecture.md), [03-authentication.md](03-authentication.md), [05-matchmaking.md](05-matchmaking.md)

---

## 1. Dịch vụ phòng (trạng thái in-memory)

RoomService: Map roomId → bản ghi phòng, Map socketId → roomId. Phòng có id, user1, user2 (socket ID), createdAt, startedAt, recentChatMessages (tối đa 20). Thao tác: createRoom, getRoom, getRoomByUser, getPeer, deleteRoom, addChatSnapshot, getChatSnapshot, updateSocketId (resync), findRoomByUserId. Khởi động lại server làm mất toàn bộ phòng đang hoạt động.

---

## 2. Handler sự kiện Socket

Đăng ký trên mỗi kết nối /chat: join, skip, signal, chat:message:send, mute-toggle, video-toggle, screen-share-toggle, reaction, favorite:notify-peer, end-call, resync-session; client:visibility:foreground/background; disconnect.

---

## 3. Vòng đời cuộc gọi

IDLE → join → QUEUED → tryMatch thành công → MATCHED (emit "matched") → signaling WebRTC → IN_CALL. Ra khỏi IN_CALL: skip (ghi lịch sử, xóa phòng, re-queue), end-call (ghi lịch sử, thông báo peer, xóa phòng), disconnect (ghi lịch sử, dequeue, peer-left, xóa phòng). Heartbeat room-ping mỗi 4 giây; nếu cả hai socket ngắt thì xóa phòng.

---

## 4. Lịch sử cuộc gọi và tiến độ

Khi kết thúc cuộc gọi: recordCallHistoryInDatabase với callerId, calleeId, startedAt, endedAt, durationSeconds, timezone. Cho mỗi người tham gia: invalidate cache tiến độ, addCallExp (streak/favorite multiplier, daily milestone), addCallDurationToStreak (freeze nếu có khoảng trống 1 ngày). Endpoint POST /api/v1/video-chat/end-call-unload dùng làm fallback khi beforeunload/visibilitychange.

---

## Thành phần liên quan

[05-matchmaking.md](05-matchmaking.md), [07-economy-system.md](07-economy-system.md), [13-socket-events-map.md](13-socket-events-map.md).

## Rủi ro

Trạng thái phòng chỉ trong bộ nhớ. Phát hiện ngắt kết nối trễ tối đa 4s. Resync quét theo clerk user ID O(n). Tin nhắn chat chỉ giữ 20 gần nhất. Không ghi hình/âm hay kiểm duyệt nội dung media.
