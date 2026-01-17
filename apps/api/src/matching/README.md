# Interest-Based Matching System

## Overview

This directory contains the pure matching algorithm that is completely decoupled from Redis, Socket.IO, and database access. The matching logic receives plain JavaScript objects and returns match results based on scoring.

## Architecture

### Separation of Concerns

1. **Matching Algorithm** (`interest-matcher.ts`)
   - Pure TypeScript logic
   - No external dependencies (Redis, Socket.IO, Database)
   - Receives `QueueUser[]` and returns `MatchResult | null`
   - Scoring-based matching with configurable weights

2. **Redis Matchmaking Service** (`../services/redis-matchmaking.ts`)
   - Handles all Redis operations
   - Manages queue, interest tag caching, and skip cooldowns
   - Calls the matching algorithm with prepared data

3. **Socket.IO Handlers** (`../socket/video-chat/handlers.ts`)
   - Handles client events (`join`, `skip`)
   - Uses Redis matchmaking service
   - Emits match results to clients

## Matching Algorithm

### Scoring Components

- **Common Interest Tags**: +100 points per shared tag
- **Both Have Tags Bonus**: +50 points if both users have interest tags (even without overlap)
- **Skip Cooldown Penalty**: -10000 points (prevents matching during cooldown)
- **Fairness Bonus**: +0.1 points per second waited (max 20 points) - prevents starvation

### Matching Rules

1. Users with MORE common interest tags are matched FIRST
2. Users who skipped each other are NOT re-matched within cooldown (10 seconds)
3. If NO users share interest tags, fallback matching occurs
4. Users with NO interest tags can still be matched
5. Users WITH tags may match users WITHOUT tags only if no better matches exist
6. System guarantees no deadlocks or starvation (fairness bonus)

## Redis Schema

### Queue (`match:queue`)
- **Type**: ZSET (Sorted Set)
- **Score**: Join timestamp (milliseconds)
- **Member**: Socket ID
- **Purpose**: Maintain ordered queue of users waiting for matches

### Interest Tags Cache (`user:interests:{dbUserId}`)
- **Type**: SET (for tags) or String (for empty marker)
- **TTL**: 15 minutes
- **Purpose**: Cache user interest tags to avoid repeated database queries
- **Empty Handling**: Uses `__empty__` string marker to distinguish "not cached" from "cached but empty"

### Skip Cooldown (`match:skip:{socketId1}:{socketId2}`)
- **Type**: String (value: "1")
- **TTL**: 10 seconds
- **Key Format**: Normalized (socketId1 < socketId2)
- **Purpose**: Prevent immediate re-matching after skip

### Socket Metadata (`match:socket:{socketId}`)
- **Type**: String (JSON)
- **TTL**: Max queue wait time + buffer
- **Content**: `{ clerkUserId, dbUserId, joinedAt }`
- **Purpose**: Map socket IDs to user IDs and metadata

## Flow

### Join Queue
1. Client emits `join` event
2. Backend fetches user's interest tags from database
3. Tags cached in Redis (15 min TTL)
4. User added to `match:queue` ZSET with timestamp score
5. Socket metadata stored in Redis

### Matching Loop (runs every 1 second)
1. Get all users from `match:queue`
2. Load cached interest tags for each user
3. Get active skip cooldowns
4. Call `findBestMatch()` with prepared data
5. Remove matched users from queue
6. Emit `matched` event to both users

### Skip User
1. Client emits `skip` event
2. Record skip cooldown in Redis (10s TTL)
3. Remove both users from current room
4. Re-enqueue both users
5. Emit `skipped` event to both users

## Edge Cases Handled

- ✅ All users have zero interest tags → Fallback matching
- ✅ Mixed users (some have tags, some don't) → Scoring handles this
- ✅ Users skipping each other repeatedly → Cooldown prevents immediate re-match
- ✅ Queue with only two users → Still matches if valid
- ✅ Rapid join/leave → Redis operations are atomic
- ✅ Redis reconnect/transient failure → Errors logged, graceful degradation

## Performance Considerations

- Interest tags cached for 15 minutes (reduces DB queries)
- Skip cooldowns auto-expire via Redis TTL (no manual cleanup needed)
- Matching algorithm is O(n²) but typically runs on small queues (< 100 users)
- Redis ZSET operations are O(log N) for queue operations
