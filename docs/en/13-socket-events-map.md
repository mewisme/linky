# 13 -- Socket Events Map

## Purpose

Complete catalog of all Socket.IO events in the Linky platform, including namespaces, event names, directions, payloads, and triggering conditions.

## Scope

All Socket.IO events across `/chat` and `/admin` namespaces.

## Dependencies

- [04-video-chat-system.md](04-video-chat-system.md) for call lifecycle
- [05-matchmaking.md](05-matchmaking.md) for queue events

## Cross References

- [08-notification-system.md](08-notification-system.md) for notification events

---

## 1. Namespace: /chat

### 1.1 Generic Chat Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `message` | Client → Server | `{ text, userId?, timestamp? }` | Generic text message |
| `message` | Server → All | `{ text, userId, timestamp }` | Broadcast message |
| `join-room` | Client → Server | `room: string` | Join a named room |
| `user-joined` | Server → Room | `{ socketId, room }` | User joined room notification |
| `leave-room` | Client → Server | `room: string` | Leave a named room |
| `user-left` | Server → Room | `{ socketId, room }` | User left room notification |

### 1.2 Visibility Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `client:visibility:foreground` | Client → Server | (none) | Tab is focused |
| `client:visibility:background` | Client → Server | (none) | Tab is backgrounded |

### 1.3 Matchmaking Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join` | Client → Server | (none) | Request to join matchmaking queue |
| `joined-queue` | Server → Client | `{ message, queueSize }` | Confirmation of queue entry |
| `matched` | Server → Client | `MatchedPayload` | Match found, includes room and peer info |
| `dequeued` | Server → Client | `{ reason }` | Removed from queue |
| `queue-timeout` | Server → Client | `{ message }` | Queue timeout after 5 minutes |

**MatchedPayload:**
```typescript
{
  roomId: string;
  peerId: string;
  isOfferer: boolean;
  peerInfo: PublicUserInfo | null;
  myInfo: PublicUserInfo | null;
}
```

### 1.4 WebRTC Signaling Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `signal` | Client → Server | `SignalPayload` | Send SDP offer/answer or ICE candidate |
| `signal` | Server → Peer | `SignalPayload` | Relay signal to peer |

**SignalPayload:**
```typescript
{
  type: "offer" | "answer" | "ice-candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  iceRestart?: boolean;
}
```

### 1.5 Call Control Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `skip` | Client → Server | (none) | Skip current match |
| `skipped` | Server → Skipper | `{ message, queueSize }` | Skip confirmation, re-queued |
| `peer-skipped` | Server → Peer | `{ message, queueSize }` | Notified of being skipped |
| `end-call` | Client → Server | (none) | End current call |
| `end-call` | Server → Peer | `{ message }` | Call ended by peer |
| `peer-left` | Server → Client | `{ message }` | Peer disconnected |
| `room-ping` | Server → Both | `{ timestamp, roomId }` | Heartbeat (every 4s) |

### 1.6 In-Call Communication Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `chat:message:send` | Client → Server | `ChatMessageInputPayload` | Send chat message |
| `chat:message` | Server → Peer | `ChatMessagePayload` | Receive chat message |
| `chat:typing` | Client → Server | `{ isTyping, timestamp }` | Typing indicator |
| `chat:typing` | Server → Peer | `{ isTyping, timestamp }` | Typing indicator relay |
| `chat:error` | Server → Client | `{ message }` | Chat error notification |

### 1.7 Media Control Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `mute-toggle` | Client → Server | `{ muted: boolean }` | Audio mute state change |
| `mute-toggle` | Server → Peer | `{ muted: boolean }` | Audio mute state relay |
| `video-toggle` | Client → Server | `{ videoOff: boolean }` | Video on/off state change |
| `video-toggle` | Server → Peer | `{ videoOff: boolean }` | Video state relay |
| `screen-share-toggle` | Client → Server | `{ sharing, streamId? }` | Screen share state change |
| `screen-share-toggle` | Server → Peer | `{ sharing, streamId? }` | Screen share relay |

### 1.8 Reaction Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `reaction` | Client → Server | `{ count, type?, timestamp }` | Send reaction |
| `reaction` | Server → Peer | `{ count, type?, timestamp }` | Reaction relay |

### 1.9 Favorite Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `favorite:notify-peer` | Client → Server | `{ action, peer_user_id, user_name }` | Notify peer of favorite action |
| `favorite:peer-event` | Server → Peer | `{ from_user_id, from_user_name }` | Favorite event from peer |

### 1.10 Resync Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `resync-session` | Client → Server | `{ timestamp? }` | Request session resynchronization |
| `resync-state` | Server → Client | Room state + chat snapshot | Resync response with current state |

### 1.11 Notification Events (via /chat)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `notification:new` | Server → Client | `NotificationRecord` | New notification |
| `notification:read` | Server → Client | `{ notificationId }` | Notification marked read |
| `notification:all-read` | Server → Client | `{}` | All notifications marked read |

### 1.12 Error Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `error` | Server → Client | `{ message }` | General error |
| `connect_error` | Socket.IO | Error object | Connection/auth failure |

---

## 2. Namespace: /admin

### 2.1 Authentication

The `/admin` namespace requires two middleware:
1. `socketAuthMiddleware` (JWT verification)
2. `adminNamespaceAuthMiddleware` (admin role check)

### 2.2 Events

The admin namespace is currently set up with basic connection handling. Real-time admin dashboard updates flow through this namespace.

---

## 3. Connection Lifecycle

```
Client connects to /chat with auth: { token }
  │
  ▼
socketAuthMiddleware verifies JWT
  │
  ├── Success: socket.data populated with userId, userName, userImageUrl
  │    ▼
  │    "connection" event fires
  │    → All event handlers registered
  │
  └── Failure: Error("Authentication required/failed")
       → Client receives "connect_error"
```

---

## 4. Event Flow Diagrams

### 4.1 Complete Match-to-Call-End Flow

```
Client A: emit("join")
Server: enqueue A → emit("joined-queue") to A

Client B: emit("join")
Server: enqueue B → emit("joined-queue") to B

Server (1s interval): tryMatch()
  → Score A-B pair
  → Create room
  → emit("matched") to A (isOfferer: true)
  → emit("matched") to B (isOfferer: false)

Client A: emit("signal", { type: "offer", sdp })
Server: relay to B → emit("signal", { type: "offer", sdp })

Client B: emit("signal", { type: "answer", sdp })
Server: relay to A → emit("signal", { type: "answer", sdp })

Client A/B: emit("signal", { type: "ice-candidate", candidate })
Server: relay ICE candidates

--- Call Active ---

Server (4s interval): emit("room-ping") to both
Clients: chat messages, reactions, media toggles

Client A: emit("end-call")
Server: record history → emit("end-call") to B → delete room
```

---

## Related Components

- Video chat system: [04-video-chat-system.md](04-video-chat-system.md)
- Matchmaking: [05-matchmaking.md](05-matchmaking.md)
- Notifications: [08-notification-system.md](08-notification-system.md)

## Risk Considerations

- No event versioning; breaking payload changes require coordinated client/server deployment
- No acknowledgment (ack) callbacks used for critical events
- Rate limiting is applied only to specific events (signal, reaction)
- Message ordering is guaranteed per-socket but not across sockets
