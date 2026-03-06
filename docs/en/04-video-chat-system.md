# 04 -- Video Chat System

## Purpose

This document describes the complete video chat system, including WebRTC signaling, room management, call lifecycle, chat messaging within calls, media controls, and call history recording with progression side effects.

## Scope

Covers the `video-chat` domain, Socket.IO event handlers, room service, call history service, and the end-call-unload HTTP fallback.

## Dependencies

- [02-architecture.md](02-architecture.md) for domain model
- [03-authentication.md](03-authentication.md) for socket auth
- [05-matchmaking.md](05-matchmaking.md) for queue/matching flow

## Cross References

- [07-economy-system.md](07-economy-system.md) for EXP/streak side effects on call end
- [08-notification-system.md](08-notification-system.md) for match push notifications
- [13-socket-events-map.md](13-socket-events-map.md) for full event catalog

---

## 1. Room Service (In-Memory State)

Location: `apps/api/src/domains/video-chat/service/rooms.service.ts`

The `RoomService` is an in-memory singleton managing all active video chat rooms.

### 1.1 Data Structures

```
rooms: Map<roomId, VideoChatRoomRecord>
userToRoom: Map<socketId, roomId>
```

### 1.2 Room Record

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Format: `room_{socketId1}_{socketId2}_{timestamp}` |
| `user1` | string | Socket ID of first participant |
| `user2` | string | Socket ID of second participant |
| `createdAt` | Date | Room creation timestamp |
| `startedAt` | Date | Call start timestamp |
| `recentChatMessages` | ChatMessageSnapshot[] | Last 20 chat messages in the room |

### 1.3 Operations

| Method | Description |
|--------|-------------|
| `createRoom(socketId1, socketId2)` | Creates room, maps both socket IDs, returns roomId |
| `getRoom(roomId)` | Returns room record or undefined |
| `getRoomByUser(socketId)` | Looks up room via userToRoom map |
| `getPeer(socketId)` | Returns the other participant's socket ID |
| `deleteRoom(roomId)` | Removes room and both userToRoom entries |
| `deleteRoomByUser(socketId)` | Finds and deletes room containing this socket |
| `isInRoom(socketId)` | Checks if socket is in any room |
| `updateSocketId(old, new)` | Remaps socket ID during resync |
| `findRoomByUserId(userId, io)` | Scans all rooms by Clerk user ID (for resync) |
| `addChatSnapshot(roomId, message)` | Appends message, caps at 20 |
| `getChatSnapshot(roomId)` | Returns copy of recent messages |

### 1.4 Failure Mode

Room state is entirely in-memory. A server restart loses all active rooms. Connected clients will receive disconnect events and must re-enter the matchmaking queue.

---

## 2. Socket Event Handlers

Location: `apps/api/src/domains/video-chat/socket/handlers.ts`

On each socket connection to the `/chat` namespace, the following handlers are registered:

### 2.1 Handler Registry

| Handler | Event(s) | Purpose |
|---------|----------|---------|
| `setupJoinHandler` | `join` | Enqueue user for matchmaking |
| `setupSkipHandler` | `skip` | Skip current match, record skip, re-queue |
| `setupSignalHandler` | `signal` | Relay WebRTC SDP and ICE candidates to peer |
| `setupChatMessageHandler` | `chat:message:send` | Broadcast chat message to room peer |
| `setupMuteToggleHandler` | `mute-toggle` | Notify peer of audio mute state change |
| `setupVideoToggleHandler` | `video-toggle` | Notify peer of video on/off state change |
| `setupScreenShareHandler` | `screen-share-toggle` | Notify peer of screen share state change |
| `setupReactionHandler` | `reaction` | Broadcast emoji reaction to room peer |
| `setupFavoriteNotificationHandler` | `favorite:notify-peer` | Notify in-call peer of favorite add/remove |
| `setupEndCallHandler` | `end-call` | End current call, record history, cleanup |
| `setupResyncHandler` | `resync-session` | Reconnect to existing room after disconnect |
| `setupDisconnectHandler` | `disconnect` | Cleanup on socket disconnect |

### 2.2 Visibility Tracking

Two additional events are registered directly:
- `client:visibility:foreground` -- Sets `socket.data.visibility = "foreground"`
- `client:visibility:background` -- Sets `socket.data.visibility = "background"`

This visibility state is used by the push notification system to avoid sending push notifications when the user's tab is focused.

---

## 3. Call Lifecycle

### 3.1 State Machine

```
IDLE
  │ "join" event
  ▼
QUEUED
  │ matchmaking.tryMatch() selects pair
  ▼
MATCHED
  │ "matched" event emitted to both users
  │ WebRTC signaling begins
  ▼
IN_CALL
  │ Room created, heartbeat active
  │ Chat, reactions, media toggles
  │
  ├── "skip" event
  │    │ Record skip cooldown
  │    │ Record call history
  │    │ Delete room
  │    │ Re-queue skipper
  │    ▼
  │  QUEUED (skipper) / IDLE (skipped peer)
  │
  ├── "end-call" event
  │    │ Record call history
  │    │ Notify peer
  │    │ Delete room
  │    ▼
  │  IDLE (both users)
  │
  └── "disconnect" event
       │ Record call history
       │ Dequeue from matchmaking
       │ Notify peer ("peer-left")
       │ Delete room
       ▼
     DISCONNECTED
```

### 3.2 Matching Flow Detail

When `matchmaking.tryMatch()` successfully finds a pair:

1. Both users are dequeued from the matchmaking queue
2. A room is created via `rooms.createRoom(socketId1, socketId2)`
3. Offerer role is determined by socket ID comparison (`socketId < socketId` is offerer)
4. Public user info is fetched for both users from the database
5. "matched" event is emitted to both sockets with:
   - `roomId` -- The room identifier
   - `peerId` -- The other user's socket ID
   - `isOfferer` -- Whether this user should initiate the WebRTC offer
   - `peerInfo` -- Public profile of the other user
   - `myInfo` -- Own public profile
6. Push notifications are sent to both users (respecting visibility state)

### 3.3 WebRTC Signaling

The server acts as a signaling relay only. It does not process WebRTC media.

Signal types relayed:
- `offer` -- SDP session description (offerer to answerer)
- `answer` -- SDP session description (answerer to offerer)
- `ice-candidate` -- ICE candidates for NAT traversal

Signal relay flow:
1. Client emits `signal` with `{ type, sdp?, candidate? }`
2. Server validates sender is in a room
3. Server forwards signal to peer socket via `io.to(peerId).emit("signal", data)`

Rate limiting is applied to signal events via `apps/api/src/domains/video-chat/socket/helpers/rate-limit.helper.ts`.

### 3.4 Room Heartbeat

Location: `apps/api/src/domains/video-chat/socket/matchmaking.socket.ts` (`setupRoomHeartbeat`)

Every 4 seconds, the server:
1. Iterates all active rooms
2. Sends `room-ping` event to both participants (if connected)
3. If both sockets are disconnected, deletes the room

Heartbeat payload: `{ timestamp: number, roomId: string }`

---

## 4. Call History and Progression

### 4.1 Call History Recording

Location: `apps/api/src/domains/video-chat/service/call-history.service.ts`

When a call ends (via end-call, skip, or disconnect):

1. `recordCallHistory` is called in `apps/api/src/domains/video-chat/socket/call-history.socket.ts`
2. The function resolves database user IDs from Clerk user IDs
3. Fetches user timezones
4. Calls `recordCallHistoryInDatabase` with:
   - `callerId` / `calleeId` (database user IDs)
   - `startedAt` / `endedAt` timestamps
   - `durationSeconds` (calculated from room age)
   - `callerTimezone` / `calleeTimezone`

### 4.2 Progression Side Effects

For each participant (when `durationSeconds > 0`):

```
applyCallProgressForUser()
  │
  ├── invalidate user progress cache
  │
  ├── addCallExp(userId, durationSeconds)
  │    │ Check streak bonus multiplier
  │    │ Check favorite exp boost (mutual > one-way > none)
  │    │ Apply multipliers to base EXP
  │    │ Increment daily EXP with milestones
  │    │ Increment EXP in Redis (exp-today counter)
  │    │ Check for level-up
  │    │   → grantRewardsForLevel() (coins)
  │    │   → grantFreezesForLevel() (streak freezes)
  │    │
  │    └── Invalidate progress cache
  │
  └── addCallDurationToStreak(userId, duration, callEndDate, timezone)
       │ Convert to user local date
       │ Check for one-day gap with available freeze
       │   → prepareStreakFreeze() + consumeFreeze()
       │ Upsert streak day record
       │ Invalidate streak calendar cache
       │
       └── Return StreakCompletionResult if first valid day
```

### 4.3 End-Call-Unload HTTP Endpoint

Location: `apps/api/src/domains/video-chat/http/end-call-unload.route.ts`

A fallback HTTP endpoint (`POST /api/v1/video-chat/end-call-unload`) is provided for browser `beforeunload`/`visibilitychange` events when the Socket.IO connection may not be reliable. This ensures call history is recorded even when the socket disconnects before the end-call event can be processed.

---

## 5. In-Call Features

### 5.1 Chat Messaging

- Client sends `chat:message:send` with text content and optional attachments
- Server validates room membership
- Server stores message snapshot in room's `recentChatMessages` (capped at 20)
- Server broadcasts `chat:message` to peer
- On resync, chat snapshot is sent to reconnecting user

### 5.2 Media Controls

| Event | Payload | Behavior |
|-------|---------|----------|
| `mute-toggle` | `{ muted: boolean }` | Forwarded to peer |
| `video-toggle` | `{ videoOff: boolean }` | Forwarded to peer |
| `screen-share-toggle` | `{ sharing: boolean, streamId?: string }` | Forwarded to peer |

### 5.3 Reactions

- Client sends `reaction` with `{ count, type?, timestamp }`
- Server validates room membership and applies rate limiting
- Server broadcasts to peer

### 5.4 Favorite Notification

- Client sends `favorite:notify-peer` with `{ action, peer_user_id, user_name }`
- Server forwards `favorite:peer-event` to peer
- Push notification sent to peer if tab is backgrounded

---

## 6. Resync Mechanism

Location: `apps/api/src/domains/video-chat/socket/setup-handlers/setup-resync.handler.ts`

When a user reconnects after a brief disconnect:

1. Client emits `resync-session`
2. Server looks up existing room by Clerk user ID (`rooms.findRoomByUserId`)
3. If room found:
   - Updates socket ID mapping (`rooms.updateSocketId`)
   - Sends `resync-state` to reconnecting user with room state and chat snapshot
   - Notifies peer of reconnection
4. If no room found:
   - Checks if user is still in matchmaking queue
   - If yes, updates queue entry with new socket ID

---

## Related Components

- Matchmaking algorithm: [05-matchmaking.md](05-matchmaking.md)
- Economy effects: [07-economy-system.md](07-economy-system.md)
- Socket event reference: [13-socket-events-map.md](13-socket-events-map.md)

## Risk Considerations

- Room state is in-memory only; no persistence across server restarts
- Room heartbeat interval (4s) means disconnection detection has up to 4s latency
- Resync relies on Clerk user ID scan across all rooms (O(n) per resync)
- Chat message snapshots are capped at 20; earlier messages are lost
- No built-in recording or moderation of video/audio streams
- Signal relay does not validate SDP/ICE content integrity
