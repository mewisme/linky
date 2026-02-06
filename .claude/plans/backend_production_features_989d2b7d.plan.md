---
name: Backend Production Features
overview: "Implement 4 production-critical backend features: user blocking system integrated with matchmaking, persistent notification center, web push notifications, and screen sharing signaling for video chat."
todos:
  - id: migration-blocks
    content: Create migration 009_user_blocks.sql with user_blocks table, constraints, and indexes
    status: pending
  - id: migration-notifications
    content: Create migration 010_notifications.sql with notifications and push_subscriptions tables
    status: pending
  - id: repo-blocks
    content: Implement user-blocks repository with getBlockedUserIds, isBlocked, createBlock, deleteBlock
    status: pending
  - id: repo-notifications
    content: Implement notifications repository with create, getUserNotifications, markRead, markAllRead
    status: pending
  - id: repo-push
    content: Implement push-subscriptions repository for web push subscription management
    status: pending
  - id: infra-push-client
    content: Create web-push.client.ts with VAPID setup and sendPushNotification function
    status: pending
  - id: service-blocks
    content: Implement user-block.service.ts with blockUser, unblockUser, getBlockedUsers, isInteractionAllowed
    status: pending
  - id: service-notifications
    content: Implement notification.service.ts with createNotification, markRead, markAllRead, real-time delivery
    status: pending
  - id: service-push
    content: Implement push.service.ts with subscribe, unsubscribe, sendPushToUser
    status: pending
  - id: routes-blocks
    content: Create user-blocks.route.ts with POST /blocks, DELETE /blocks/:id, GET /blocks/me
    status: pending
  - id: routes-notifications
    content: Create notifications.route.ts with GET /me, PATCH /:id/read, PATCH /read-all
    status: pending
  - id: routes-push
    content: Create push.route.ts with POST /subscribe, DELETE /unsubscribe, GET /vapid-public-key
    status: pending
  - id: matchmaking-integration
    content: Integrate block filtering into redis-matchmaking.service.ts (data loading, filtering, fallback)
    status: pending
  - id: screen-share-socket
    content: Add screen-share:toggle socket handler in video-chat handlers
    status: pending
  - id: cache-keys-ttl
    content: Add USER_BLOCKS cache key and TTL to Redis cache configuration
    status: pending
  - id: route-mounting
    content: Mount new routers in routes/api.ts and update domain index exports
    status: pending
  - id: types-update
    content: Add domain-specific types for blocks, notifications, push, screen-share
    status: pending
  - id: config-vapid
    content: Add VAPID configuration to apps/api/src/config/index.ts
    status: pending
  - id: notification-triggers
    content: Add notification creation calls to favorites, level, streak, and admin services
    status: pending
  - id: type-check
    content: Regenerate database types and run pnpm check-types --filter @repo/api
    status: pending
isProject: false
---

# Backend Production Features Implementation

## Architecture Overview

This plan implements 4 backend features following Linky's domain-driven architecture:

- Domain isolation (no cross-domain imports)
- Repository pattern for data access
- Service layer for business logic
- Redis cache-aside for optimization
- Supabase as source of truth
- Socket.IO for real-time delivery

## 1. User Blocking System

### Database Migration

Create `apps/api/migrations/009_user_blocks.sql`:

**Table: `user_blocks`**

```sql
CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "blocker_user_id" uuid NOT NULL,
  "blocked_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_blocks_blocker_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_blocks_blocked_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_blocks_unique" UNIQUE ("blocker_user_id", "blocked_user_id"),
  CONSTRAINT "user_blocks_different_users" CHECK ("blocker_user_id" <> "blocked_user_id")
);

CREATE INDEX "user_blocks_blocker_idx" ON "public"."user_blocks" ("blocker_user_id");
CREATE INDEX "user_blocks_blocked_idx" ON "public"."user_blocks" ("blocked_user_id");
```

### Repository Layer

Create `apps/api/src/infra/supabase/repositories/user-blocks.ts`:

Pattern follows `favorites.ts` with functions:

- `getBlockedUserIds(userId: string): Promise<string[]>` - Returns array of blocked user IDs
- `isBlocked(blockerId: string, targetId: string): Promise<boolean>` - Bidirectional check
- `createBlock(blockerId: string, blockedId: string): Promise<BlockRecord>` - Creates block
- `deleteBlock(blockerId: string, blockedId: string): Promise<boolean>` - Removes block

Export from `apps/api/src/infra/supabase/repositories/index.ts`

### Domain Service

Create `apps/api/src/domains/user/service/user-block.service.ts`:

Functions:

- `blockUser(blockerId, blockedId)` - Creates block, invalidates caches
- `unblockUser(blockerId, blockedId)` - Removes block, invalidates caches  
- `getBlockedUsers(userId)` - Gets blocked list with caching
- `isInteractionAllowed(userA, userB)` - Bidirectional block check

Cache pattern:

- Key: `user:blocks:{userId}` (Redis set)
- TTL: 30 minutes (`REDIS_CACHE_TTL_SECONDS.USER_BLOCKS`)
- Invalidate on block/unblock

### API Routes

Create `apps/api/src/domains/user/http/user-blocks.route.ts`:

Routes:

- `POST /api/v1/users/blocks` - Body: `{ blocked_user_id: string }`
- `DELETE /api/v1/users/blocks/:blocked_user_id` - Unblock user
- `GET /api/v1/users/blocks/me` - List blocked users

Pattern: Follow `user-profile.route.ts` with auth validation, error handling

Export router from `apps/api/src/domains/user/index.ts`

Mount in `apps/api/src/routes/api.ts`:

```typescript
router.use("/users/blocks", userBlocksRouter);
```

### Matchmaking Integration

Modify `apps/api/src/domains/matchmaking/service/redis-matchmaking.service.ts`:

**Add block loading** (after line 138):

```typescript
const blockedSets = await this.loadBlockedSets(userIds);
```

**Add filter** (lines 195-228):

```typescript
const blockedSetA = blockedSets.get(userA.userId);
const blockedSetB = blockedSets.get(userB.userId);
const isBlocked = blockedSetA?.has(userB.userId) || blockedSetB?.has(userA.userId);

if (!hasSkipCooldown && !isBlocked) {
  allCandidates.push(candidate);
}
```

**Apply to fallback** (line 236+): Also check blocks in fallback matching - blocks are NEVER bypassed

**Cache on enqueue** (line 52):

```typescript
await this.cacheUserBlocks(dbUserId);
```

**New methods**:

- `loadBlockedSets(userIds: string[]): Promise<Map<string, Set<string>>>` - Parallel load blocked sets
- `cacheUserBlocks(userId: string)` - Caches blocked users on queue join

### Video Chat Integration

Modify `apps/api/src/domains/video-chat/socket/handlers.ts`:

Add block check in call initiation to handle edge case where users are matched but one blocks during call:

- On `end-call` with reason "blocked", force disconnect peer

### Types

`apps/api/src/domains/user/types/user-block.types.ts`:

```typescript
export interface BlockRecord {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  created_at: string;
}
```

---

## 2. Notification Center (In-App)

### Database Migration

Add to `apps/api/migrations/009_user_blocks.sql` (or create `010_notifications.sql`):

**Table: `notifications`**

```sql
CREATE TABLE IF NOT EXISTS "public"."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" ("user_id");
CREATE INDEX "notifications_is_read_idx" ON "public"."notifications" ("is_read");
CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" ("created_at" DESC);
CREATE INDEX "notifications_user_unread_idx" ON "public"."notifications" ("user_id", "is_read") WHERE "is_read" = false;
```

### Domain Structure

Create `apps/api/src/domains/notification/`:

- `http/notifications.route.ts`
- `service/notification.service.ts`
- `socket/notification.socket.ts`
- `types/notification.types.ts`
- `index.ts`

### Repository Layer

Create `apps/api/src/infra/supabase/repositories/notifications.ts`:

Functions:

- `createNotification(userId, type, payload)` - Inserts notification
- `getUserNotifications(userId, params: { limit, offset, unreadOnly? })` - Paginated fetch
- `markNotificationRead(notificationId, userId)` - Marks single read
- `markAllNotificationsRead(userId)` - Marks all read
- `getUnreadCount(userId)` - Count unread

### Domain Service

`apps/api/src/domains/notification/service/notification.service.ts`:

Functions:

- `createNotification(userId, type, payload)` - Creates + sends to socket if online
- `markRead(notificationId, userId)` - Marks read + emits update
- `markAllRead(userId)` - Bulk mark + emit
- `getUserNotifications(userId, options)` - Cached retrieval

Notification Types:

- `favorite_added` - Payload: `{ from_user_id, from_user_name }`
- `level_up` - Payload: `{ new_level }`
- `streak_milestone` - Payload: `{ days }`
- `streak_expiring` - Payload: `{ expires_in_hours }`
- `admin_broadcast` - Payload: `{ message, title? }`

### API Routes

`apps/api/src/domains/notification/http/notifications.route.ts`:

Routes:

- `GET /api/v1/notifications/me?limit=20&offset=0&unread_only=false` - List notifications
- `PATCH /api/v1/notifications/:id/read` - Mark read
- `PATCH /api/v1/notifications/read-all` - Mark all read
- `GET /api/v1/notifications/me/unread-count` - Count unread

### Socket Integration

Use existing `/chat` namespace:

Events:

- `notification:new` - Server → Client when notification created
- `notification:read` - Server → Client when marked read
- `notification:all-read` - Server → Client when all marked read

Emit pattern (in `notification.service.ts`):

```typescript
const userSocket = context.io.sockets.get(userSocketId);
if (userSocket?.connected) {
  userSocket.emit("notification:new", notification);
}
```

### Integration Points

Trigger notifications from:

1. **Favorites** - `apps/api/src/domains/favorites/service/favorites.service.ts` - On favorite added
2. **User Level** - `apps/api/src/domains/user/service/user-level.service.ts` - On level up
3. **Streak** - `apps/api/src/domains/user/service/user-streak.service.ts` - On milestone/expiring
4. **Admin** - `apps/api/src/domains/admin/http/admin-broadcasts.route.ts` - Admin announcements

Pattern:

```typescript
import { createNotification } from "../../notification/service/notification.service.js";

await createNotification(userId, "level_up", { new_level: 5 });
```

---

## 3. Web Push Notifications

### Database Migration

Add to notifications migration:

**Table: `push_subscriptions`**

```sql
CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "push_subscriptions_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE ("endpoint")
);

CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" ("user_id");
```

### Dependencies

Add to `apps/api/package.json`:

```json
"dependencies": {
  "web-push": "^3.6.7"
}
```

### Infrastructure Layer

Create `apps/api/src/infra/push/web-push.client.ts`:

Setup VAPID keys (generate once, store in env):

```typescript
import webpush from "web-push";
import { config } from "../../config/index.js";

webpush.setVapidDetails(
  config.vapidSubject, // e.g., "mailto:support@linky.app"
  config.vapidPublicKey,
  config.vapidPrivateKey
);

export async function sendPushNotification(subscription, payload) {
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

export { webpush };
```

### Repository Layer

Create `apps/api/src/infra/supabase/repositories/push-subscriptions.ts`:

Functions:

- `createSubscription(userId, subscription)` - Upserts subscription
- `deleteSubscription(userId, endpoint)` - Removes subscription
- `getUserSubscriptions(userId)` - Gets all user subscriptions
- `deleteExpiredSubscription(endpoint)` - Cleanup on 410 Gone

### Domain Service

Create `apps/api/src/domains/notification/service/push.service.ts`:

Functions:

- `subscribe(userId, subscription)` - Stores subscription
- `unsubscribe(userId, endpoint)` - Removes subscription
- `sendPushToUser(userId, notification)` - Sends to all user's devices
- `handlePushError(error, endpoint)` - Handles 410 Gone (expired)

Integration with notification service:

```typescript
// In notification.service.ts createNotification():
if (!userOnline) {
  await sendPushToUser(userId, notification);
}
```

### API Routes

Create `apps/api/src/domains/notification/http/push.route.ts`:

Routes:

- `POST /api/v1/push/subscribe` - Body: `{ subscription: { endpoint, keys: { p256dh, auth } } }`
- `DELETE /api/v1/push/unsubscribe` - Body: `{ endpoint }`
- `GET /api/v1/push/vapid-public-key` - Returns public VAPID key

### Configuration

Add to `apps/api/src/config/index.ts`:

```typescript
vapidSubject: process.env.VAPID_SUBJECT,
vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
```

---

## 4. Screen Sharing

### Socket Event Types

Add to `apps/api/src/domains/video-chat/types/socket-event.types.ts`:

```typescript
export interface ScreenShareTogglePayload {
  sharing: boolean;
  streamId?: string;
}
```

### Socket Handler

Modify `apps/api/src/domains/video-chat/socket/handlers.ts`:

Add handler function:

```typescript
function setupScreenShareHandler(
  socket: AuthenticatedSocket,
  io: Namespace,
  rooms: VideoChatRooms
): void {
  socket.on("screen-share:toggle", (data: ScreenShareTogglePayload) => {
    const room = rooms.getRoomByUser(socket.id);
    if (!room) {
      socket.emit("error", { 
        message: "Not in a room",
        code: "NOT_IN_ROOM" 
      });
      return;
    }

    const peerId = rooms.getPeer(socket.id);
    if (!peerId) return;

    const peerSocket = io.sockets.get(peerId);
    if (!peerSocket?.connected) return;

    io.to(peerId).emit("screen-share:toggle", {
      sharing: data.sharing,
      streamId: data.streamId,
    });
  });
}
```

Register in `setupSocketHandlers()` (after line 78):

```typescript
setupScreenShareHandler(socket, context.io, context.rooms);
```

### Room State (Optional)

Optionally extend `apps/api/src/domains/video-chat/types/room.types.ts`:

```typescript
export interface VideoChatRoom {
  user1: string;
  user2: string;
  startedAt: Date;
  user1ScreenSharing?: boolean; // Optional tracking
  user2ScreenSharing?: boolean;
}
```

Update room state in handler if tracking is needed.

### Resync Handler

Update `setupResyncHandler` to include screen share state in resync payload.

---

## Database Type Generation

After migrations:

1. Apply migrations to Supabase
2. Regenerate types: `supabase gen types typescript --project-id <id> > apps/api/src/types/database/supabase.types.ts`
3. Commit type updates

---

## Testing Strategy

Run type checking after implementation:

```bash
pnpm check-types --filter @repo/api
```

Verify:

1. Block filtering prevents matches
2. Notifications persist and deliver via socket
3. Push subscriptions stored correctly
4. Screen share signals relay between peers

---

## File Summary

### New Files

- `apps/api/migrations/009_user_blocks.sql`
- `apps/api/migrations/010_notifications.sql`
- `apps/api/src/infra/supabase/repositories/user-blocks.ts`
- `apps/api/src/infra/supabase/repositories/notifications.ts`
- `apps/api/src/infra/supabase/repositories/push-subscriptions.ts`
- `apps/api/src/infra/push/web-push.client.ts`
- `apps/api/src/domains/user/service/user-block.service.ts`
- `apps/api/src/domains/user/http/user-blocks.route.ts`
- `apps/api/src/domains/user/types/user-block.types.ts`
- `apps/api/src/domains/notification/` (entire domain)

### Modified Files

- `apps/api/src/domains/matchmaking/service/redis-matchmaking.service.ts` - Block filtering
- `apps/api/src/domains/video-chat/socket/handlers.ts` - Screen share handler
- `apps/api/src/domains/video-chat/types/socket-event.types.ts` - Screen share types
- `apps/api/src/routes/api.ts` - Mount block routes
- `apps/api/src/infra/supabase/repositories/index.ts` - Export new repositories
- `apps/api/src/infra/redis/cache/keys.ts` - Add block cache keys
- `apps/api/src/infra/redis/cache/policy.ts` - Add block cache TTL
- `apps/api/src/domains/user/index.ts` - Export block router
- `apps/api/package.json` - Add `web-push` dependency
- `apps/api/src/config/index.ts` - Add VAPID config

### Integration Touchpoints

- Favorites service - Create notification on favorite added
- User level service - Create notification on level up
- User streak service - Create notification on milestone/expiring
- Admin routes - Create broadcast notifications

