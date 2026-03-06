# 09 -- Admin System

## Purpose

This document describes the administrative system of the Linky platform, including the admin role model, all CRUD operations, economy management tools, broadcast system, embedding management, and the admin permission matrix.

## Scope

Covers the `admin` domain, admin middleware, admin socket namespace, and all admin HTTP routes.

## Dependencies

- [03-authentication.md](03-authentication.md) for admin auth flow
- [07-economy-system.md](07-economy-system.md) for economy configuration

## Cross References

- [11-security-model.md](11-security-model.md) for admin security implications
- [14-api-contracts.md](14-api-contracts.md) for endpoint specifications

---

## 1. Admin Role Model

### 1.1 Roles

| Role | Level | Description |
|------|-------|-------------|
| `user` | 0 | Standard user, no admin access |
| `admin` | 1 | Full access to admin panel and operations |
| `superadmin` | 2 | Admin + user role management + destructive operations |

### 1.2 Role Storage and Caching

- Database: `users.role` column
- Redis cache: `admin:role:{clerkUserId}` with 5-minute TTL
- Cache values: `"admin"`, `"superadmin"`, or `"user"`
- Cache warmup: `initializeAdminCache()` preloads all admin roles on startup

---

## 2. Admin Route Structure

All admin routes are mounted under `/api/v1/admin/` and protected by both `clerkMiddleware` and `adminMiddleware`.

### 2.1 Admin Resource Routes

| Resource | Path | Operations |
|----------|------|------------|
| Users | `/admin/users` | List, Get, Patch, Batch operations |
| Reports | `/admin/reports` | List, Get, Patch (status update) |
| Changelogs | `/admin/changelogs` | List, Create, Update, Delete |
| Interest Tags | `/admin/interest-tags` | List, Create, Update, Soft Delete, Hard Delete, Import |
| Broadcasts | `/admin/broadcasts` | List, Create |
| Level Rewards | `/admin/level-rewards` | List, Create, Update, Delete |
| Level Feature Unlocks | `/admin/level-feature-unlocks` | List, Create, Update, Delete |
| Favorite EXP Boost | `/admin/favorite-exp-boost` | List, Create, Update, Delete |
| Streak EXP Bonuses | `/admin/streak-exp-bonuses` | List, Create, Update, Delete |
| Seasons | `/admin/seasons` | List, Create, Update, Force Decay |
| Economy Stats | `/admin/economy/stats` | Get aggregate statistics |
| Economy Simulate | `/admin/economy/simulate` | Run economy simulation |
| Embeddings | `/admin/embeddings` | Compare, Similar search, Sync, Sync All |
| Config | `/admin/config` | List, Get, Set, Delete key-value pairs |
| Media | `/admin/media` | Presigned upload URL generation |

---

## 3. Admin CRUD Services

### 3.1 User Management

Location: `apps/api/src/domains/admin/service/admin-users.service.ts`

Operations:
- List users with pagination and filters
- Get user by ID with full details
- Patch user fields (role, status, etc.)
- Batch operations on multiple users

Data source: `admin_users_unified` (database view joining `users`, `user_details`, and related data)

### 3.2 Report Management

Operations:
- List reports with status filter (`pending`, `reviewed`, `resolved`, `dismissed`)
- Get report by ID with context (report_contexts table)
- Update report status
- Report context includes reporter and reported user details

### 3.3 Interest Tag Management

Operations:
- List all tags (including soft-deleted for admin view)
- Create new tag
- Update tag (name, icon, category)
- Soft delete (set `deleted = true`)
- Hard delete (permanent removal, superadmin only)
- Bulk import (create multiple tags from array)

### 3.4 Changelog Management

Operations:
- List changelogs with pagination
- Create new changelog entry
- Update existing changelog
- Delete changelog

### 3.5 Level Rewards Configuration

Manages `level_rewards` table defining coin rewards granted at specific levels.

### 3.6 Level Feature Unlocks Configuration

Manages `level_feature_unlocks` table defining platform features unlocked at specific levels.

### 3.7 Favorite EXP Boost Rules

Manages `favorite_exp_boost_rules` table defining EXP multipliers for calls between favorites.

### 3.8 Streak EXP Bonuses

Manages `streak_exp_bonuses` table defining EXP multipliers based on streak length.

---

## 4. Economy Administration

### 4.1 Economy Statistics

Location: `apps/api/src/domains/admin/service/admin-economy-stats.service.ts`

RPC: `get_economy_stats`

Returns aggregate economy metrics for the admin dashboard.

### 4.2 Economy Simulation

Location: `apps/api/src/domains/admin/service/admin-economy-simulate.service.ts`

Allows admins to simulate economy scenarios by running the stabilizer with modified parameters.

### 4.3 Season Management

Operations:
- List all seasons
- Create season (with validation that only one can be active)
- Update season parameters (name, dates, decay threshold, decay rate)
- Force decay execution for a specific season

### 4.4 Economy Configuration

Table: `economy_config` (key-value store)

Managed configuration keys:
- `stabilization_enabled` -- Boolean flag for economy stabilizer
- `conversion_bonus_multiplier` -- EXP-to-coin conversion bonus rate
- `cosmetic_price_multiplier` -- Shop price multiplier
- `seasonal_decay_rate` -- Coin decay rate on season end
- `avg_coin_per_user_cap` -- Threshold for price adjustment trigger

---

## 5. Broadcast System

Location: `apps/api/src/contexts/broadcast-context.ts`

### 5.1 Broadcast Flow

```
Admin creates broadcast
  │
  ├── Store in broadcast_history table
  │
  ├── Create notification for each target user
  │    └── Uses createNotification() which handles
  │        socket delivery and push fallback
  │
  └── Log broadcast metadata
```

### 5.2 Broadcast Record

Table: `broadcast_history`

Fields: `id`, `title`, `message`, `url`, `created_by`, `target_count`, `created_at`

---

## 6. Admin Config (Key-Value Store)

Table: `admin_config`

### 6.1 Operations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/config` | List all config entries |
| GET | `/admin/config/:key` | Get specific config value |
| PUT | `/admin/config/:key` | Set config value (upsert) |
| DELETE | `/admin/config/:key` | Delete config entry |

### 6.2 Schema

| Column | Type | Description |
|--------|------|-------------|
| `key` | text | Configuration key (unique) |
| `value` | jsonb | Configuration value |
| `updated_at` | timestamp | Last modification |

---

## 7. Admin Socket Namespace

Namespace: `/admin`

### 7.1 Authentication

Two-layer middleware:
1. `socketAuthMiddleware` -- JWT verification
2. `adminNamespaceAuthMiddleware` -- Admin role check

### 7.2 Purpose

The admin namespace enables real-time admin dashboard updates, such as:
- Live user count updates
- Real-time report submissions
- Economy metric streaming

---

## 8. Soft Delete vs Hard Delete Rules

| Resource | Soft Delete | Hard Delete |
|----------|------------|-------------|
| Users | Yes (deleted + deleted_at) | No (never hard deleted) |
| Interest Tags | Yes (deleted flag) | Yes (superadmin, separate endpoint) |
| Reports | No (status-based lifecycle) | No |
| Changelogs | No | Yes (admin) |
| Level Rewards | No | Yes (admin) |
| Level Feature Unlocks | No | Yes (admin) |
| Favorite EXP Boost Rules | No | Yes (admin) |
| Streak EXP Bonuses | No | Yes (admin) |

---

## 9. Admin Permission Matrix

| Operation | admin | superadmin |
|-----------|-------|------------|
| View admin dashboard | Yes | Yes |
| List/view users | Yes | Yes |
| Update user details | Yes | Yes |
| Change user roles | No | Yes |
| View/manage reports | Yes | Yes |
| Manage changelogs | Yes | Yes |
| Manage interest tags | Yes | Yes |
| Hard delete interest tags | No | Yes |
| Manage level rewards | Yes | Yes |
| Manage feature unlocks | Yes | Yes |
| Manage economy config | Yes | Yes |
| Run economy simulation | Yes | Yes |
| Force season decay | Yes | Yes |
| Create broadcasts | Yes | Yes |
| Manage embeddings | Yes | Yes |
| Generate presigned uploads | Yes | Yes |

Note: The distinction between admin and superadmin is primarily enforced at the frontend level via `isSuperAdmin(role)` checks. Backend admin middleware grants access to any admin or superadmin.

---

## Related Components

- Auth flow: [03-authentication.md](03-authentication.md)
- Economy system: [07-economy-system.md](07-economy-system.md)
- Database tables: [12-database-schema.md](12-database-schema.md)

## Risk Considerations

- Admin/superadmin distinction is partially frontend-enforced; backend treats both as authorized for most endpoints
- Admin role cache TTL (5 minutes) means role revocation takes up to 5 minutes
- Broadcast creation iterates over all target users; large user bases may cause timeouts
- Economy configuration changes take effect immediately with no rollback mechanism
- Hard delete of interest tags may break existing user profile references
