# 08 -- Notification System

## Purpose

This document describes the notification infrastructure of the Linky platform, including persistent notifications, real-time socket delivery, Web Push notifications, MQTT-based user presence, and the push vs socket decision matrix.

## Scope

Covers the `notification` domain, push service, MQTT presence client, and the peer-action notification context.

## Dependencies

- [02-architecture.md](02-architecture.md) for infrastructure layer
- [03-authentication.md](03-authentication.md) for socket authentication

## Cross References

- [04-video-chat-system.md](04-video-chat-system.md) for match notifications
- [13-socket-events-map.md](13-socket-events-map.md) for notification socket events

---

## 1. Notification Architecture

```
Event Source (call end, favorite add, level up, admin broadcast)
  │
  ▼
createNotification(userId, type, payload)
  │
  ├── 1. Persist to database (notifications table)
  │
  ├── 2. Attempt socket delivery
  │    │ Check if user has active socket connection
  │    │ If connected → emit "notification:new"
  │    │ Return true/false
  │    │
  │    └── If delivered via socket → DONE
  │
  └── 3. Fall back to Web Push
       │ sendPushToUser(userId, notification)
       │ Fetch all push subscriptions for user
       │ Build push payload (title, body, icon, badge, URL)
       │ Send to all subscriptions (parallel)
       │ Handle 410 (expired) → delete subscription
       └── DONE
```

---

## 2. Notification Types

| Type | Title | Body Template | URL |
|------|-------|---------------|-----|
| `favorite_added` | "New Favorite" | "{from_user_name} added you as a favorite" | `/notifications` |
| `level_up` | "Level Up!" | "You reached level {new_level}!" | `/notifications` |
| `streak_milestone` | "Streak Milestone" | "{days} day streak achieved!" | `/notifications` |
| `streak_expiring` | "Streak Expiring Soon" | "Your streak expires in {expires_in_hours} hours" | `/notifications` |
| `admin_broadcast` | "{title}" or "Announcement" | "{message}" | `{url}` or `/notifications` |

---

## 3. Socket Delivery

### 3.1 Notification Context

Location: `apps/api/src/domains/notification/service/notification.service.ts`

The notification service maintains a `NotificationContext` with:
- `io` -- Socket.IO server reference
- `getSocketByUserId` -- Function to locate a user's active socket

### 3.2 Socket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `notification:new` | Server → Client | Full notification record | New notification delivered |
| `notification:read` | Server → Client | `{ notificationId }` | Notification marked as read |
| `notification:all-read` | Server → Client | `{}` | All notifications marked as read |

### 3.3 Delivery Logic

```
tryDeliverViaSocket(userId, notification):
  1. Check NotificationContext is initialized
  2. Look up socket by user ID
  3. If socket exists and is connected:
     - socket.emit("notification:new", notification)
     - Return true
  4. Return false
```

---

## 4. Web Push (VAPID)

### 4.1 Configuration

- `VAPID_SUBJECT` -- Contact URL/email for the push service
- `VAPID_PUBLIC_KEY` -- VAPID public key
- `VAPID_PRIVATE_KEY` -- VAPID private key

### 4.2 Subscription Management

Table: `push_subscriptions`

| Column | Description |
|--------|-------------|
| `id` | Primary key |
| `user_id` | User identifier |
| `endpoint` | Push service endpoint URL |
| `p256dh` | Client public key |
| `auth` | Authentication secret |
| `created_at` | Subscription creation time |

Endpoints:
- `POST /api/v1/push/subscribe` -- Register subscription
- `POST /api/v1/push/unsubscribe` -- Remove subscription
- `GET /api/v1/push/vapid-public-key` -- Retrieve VAPID public key for client-side subscription

### 4.3 Push Payload Structure

```json
{
  "notification": {
    "title": "Notification Title",
    "body": "Notification body text",
    "icon": "/icon-192x192.png",
    "badge": "/badge-72x72.png",
    "data": {
      "url": "/notifications",
      "notificationId": "uuid"
    }
  }
}
```

### 4.4 Expired Subscription Handling

When a push service returns HTTP 410 (Gone), the subscription endpoint is automatically deleted from the database via `deleteExpiredSubscription(endpoint)`.

### 4.5 Push-Only Notifications

The `sendPushOnly` function sends a push notification without creating a persistent notification record. Used for ephemeral alerts like match notifications.

Parameters:
- `title` -- Notification title
- `body` -- Notification body
- `url` -- Click target URL
- `onlyWhenBlurred` -- Flag for client to suppress if tab is focused
- `data` -- Additional data payload

---

## 5. Peer Action Notification

Location: `apps/api/src/contexts/peer-action-notification-context.ts`

### 5.1 Visibility-Aware Push

When a peer action occurs during a video chat (e.g., match found), the system checks the target user's tab visibility:

```
sendPeerActionPush(params):
  1. Check peerSocket.data.visibility
  2. If "foreground" → SKIP push (user is actively viewing)
  3. If "background" or unknown → send push-only notification
     with onlyWhenBlurred: true
```

### 5.2 Use Cases

- **Match Found**: When matchmaking pairs two users, push is sent to both if their tabs are backgrounded
- **Favorite Added During Call**: When a peer adds the user as a favorite during a call

---

## 6. MQTT Presence System

Location: `apps/web/src/lib/messaging/mqtt-client.ts`

### 6.1 Connection

The frontend creates an MQTT client over WSS:
```
wss://{MQTT_URL}:{MQTT_PORT}/mqtt
```

Client ID: User's database user ID

### 6.2 Presence Publishing

- On connect: Publish `presence/{userId}` with `{ state: "online" }` (retained)
- On close: LWT (Last Will and Testament) publishes `presence/{userId}` with `{ state: "offline" }` (retained)

### 6.3 LWT (Last Will and Testament)

The MQTT client is configured with a "will" message that the broker publishes automatically when the client disconnects unexpectedly:

```json
{
  "topic": "presence/{userId}",
  "payload": "{\"state\": \"offline\"}",
  "retain": true
}
```

This ensures offline status is published even on network failure or browser crash.

### 6.4 Subscription Model

Other clients subscribe to `presence/{userId}` topics to receive real-time online/offline updates.

---

## 7. Push vs Socket Decision Matrix

| Scenario | Socket | Push | Notes |
|----------|--------|------|-------|
| User is connected and tab is focused | Deliver | Skip | Socket delivery is immediate |
| User is connected but tab is backgrounded | Deliver | Also send push | Socket may not surface notification |
| User is disconnected | Skip | Deliver | Fallback to push |
| User has no push subscriptions | Skip | Skip | Notification persisted but not delivered |
| Ephemeral alert (match found) | N/A | Send push-only | No persistent record |
| Admin broadcast | Deliver | Fallback | Standard notification flow |

---

## 8. Notification API

### 8.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/notifications/me` | Get user's notifications (paginated) |
| GET | `/api/v1/notifications/me/unread-count` | Get unread notification count |
| POST | `/api/v1/notifications/read-all` | Mark all as read |
| POST | `/api/v1/notifications/{id}/read` | Mark specific notification as read |

### 8.2 Notification Record

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Notification identifier |
| `user_id` | text | Target user |
| `type` | text | Notification type |
| `payload` | jsonb | Type-specific data |
| `read` | boolean | Read status |
| `created_at` | timestamp | Creation time |

---

## Related Components

- Video chat match notifications: [04-video-chat-system.md](04-video-chat-system.md)
- Socket event reference: [13-socket-events-map.md](13-socket-events-map.md)
- Admin broadcasts: [09-admin-system.md](09-admin-system.md)

## Risk Considerations

- MQTT broker is externally managed; outage means no presence tracking
- Web Push delivery is best-effort; browser and OS may delay or suppress notifications
- Push subscription cleanup only handles 410 responses; stale subscriptions with other errors accumulate
- Socket-based notification delivery depends on NotificationContext being properly initialized
- No notification batching or rate limiting for high-frequency events
- MQTT keepalive (30s) and reconnect period (2s) are fixed values
