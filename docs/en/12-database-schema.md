# 12 -- Database Schema

## Purpose

This document catalogs all database tables, views, and RPC functions used by the Linky platform, with column-level detail and side-effect documentation.

## Scope

All Supabase/Postgres tables referenced in the codebase, all database views, and all RPC functions.

## Dependencies

- [02-architecture.md](02-architecture.md) for data access patterns

## Cross References

- [07-economy-system.md](07-economy-system.md) for economy table usage
- [10-caching-architecture.md](10-caching-architecture.md) for cached tables

---

## 1. Core User Tables

### users

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `clerk_user_id` | text | Clerk identity provider ID |
| `email` | text | User email address |
| `first_name` | text | First name (from Clerk) |
| `last_name` | text | Last name (from Clerk) |
| `avatar_url` | text | Profile image URL (from Clerk) |
| `role` | text | Role: `user`, `admin`, `superadmin` |
| `deleted` | boolean | Soft delete flag |
| `deleted_at` | timestamp | Soft delete timestamp |
| `created_at` | timestamp | Registration timestamp |
| `updated_at` | timestamp | Last update timestamp |

### user_details

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `bio` | text | User biography |
| `gender` | text | Gender |
| `date_of_birth` | text | Date of birth |
| `country` | text | Country |
| `timezone` | text | IANA timezone identifier |
| `interest_tag_ids` | uuid[] | Array of interest tag IDs |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### user_settings

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `theme` | text | UI theme preference |
| `language` | text | Language preference |
| `notifications_enabled` | boolean | Global notification toggle |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

---

## 2. Progression Tables

### user_levels

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `total_exp_seconds` | integer | Cumulative EXP (in seconds) |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### user_streaks

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `current_streak` | integer | Current consecutive valid days |
| `longest_streak` | integer | All-time longest streak |
| `last_valid_date` | text | Date string of last valid streak day |
| `last_continuation_used_freeze` | boolean | Whether last streak continuation used a freeze |
| `updated_at` | timestamp | Last update timestamp |

### user_streak_days

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `date` | text | Date string (YYYY-MM-DD in user's timezone) |
| `total_call_seconds` | integer | Total call seconds on this day |
| `is_valid` | boolean | Whether sufficient time for streak credit |
| `created_at` | timestamp | Creation timestamp |

### user_exp_daily

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `date` | text | Local date string |
| `exp_seconds` | integer | Total EXP earned on this day |
| `milestone_600_claimed` | boolean | 10-minute milestone claimed |
| `milestone_1800_claimed` | boolean | 30-minute milestone claimed |
| `milestone_3600_claimed` | boolean | 60-minute milestone claimed |

### user_level_rewards

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `level` | integer | Level at which reward was granted |
| `reward_id` | uuid (FK) | References level_rewards.id |
| `coins_granted` | integer | Coins given |
| `created_at` | timestamp | Grant timestamp |

---

## 3. Streak Freeze Tables

### user_streak_freeze_inventory

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `available_count` | integer | Number of freezes available |
| `total_granted` | integer | Lifetime freezes granted |
| `total_used` | integer | Lifetime freezes consumed |

### user_streak_freeze_grants

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `level` | integer | Level at which freezes were granted |
| `count` | integer | Number of freezes granted |
| `created_at` | timestamp | Grant timestamp |

---

## 4. Social Tables

### user_favorites

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | User who favorites |
| `favorite_user_id` | text (FK) | User being favorited |
| `created_at` | timestamp | Creation timestamp |

### user_favorite_limits

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `max_favorites` | integer | Maximum favorites allowed |

### user_blocks

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | Blocking user |
| `blocked_user_id` | text (FK) | Blocked user |
| `created_at` | timestamp | Block timestamp |

---

## 5. Economy Tables

### user_wallets

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `coin_balance` | integer | Available coins |
| `vault_coin_balance` | integer | Vault-protected coins |
| `total_earned` | integer | Lifetime coins earned |
| `total_spent` | integer | Lifetime coins spent |
| `created_at` | timestamp | Wallet creation timestamp |
| `updated_at` | timestamp | Last transaction timestamp |

### user_coin_transactions

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `type` | text | Transaction type (see economy types) |
| `amount` | integer | Transaction amount (positive or negative) |
| `source` | text | Transaction source identifier |
| `metadata` | jsonb | Additional transaction data |
| `created_at` | timestamp | Transaction timestamp |

### economy_config

| Column | Type | Description |
|--------|------|-------------|
| `key` | text | Configuration key (PK) |
| `value` | jsonb | Configuration value |
| `updated_at` | timestamp | Last update timestamp |

### economy_metrics_daily

| Column | Type | Description |
|--------|------|-------------|
| `date` | text | Date (PK) |
| `total_coin_supply` | integer | Total coins in circulation |
| `total_vault_supply` | integer | Total vault coins |
| `total_coin_minted` | integer | Cumulative coins created |
| `total_coin_burned` | integer | Cumulative coins destroyed |
| `total_exp_generated` | integer | Total EXP generated |
| `total_exp_converted` | integer | Total EXP converted |
| `active_users_count` | integer | Active users for the day |
| `avg_coin_per_user` | numeric | Average coins per user |
| `top_10_percent_ratio` | numeric | Coin share of top 10% users |

### economy_health_reports

| Column | Type | Description |
|--------|------|-------------|
| `date` | text | Report date (PK, upsert on conflict) |
| `health_status` | text | `stable`, `inflation_risk`, `deflation_risk`, `whale_dominance` |
| `metrics_snapshot` | jsonb | Economy metrics at time of report |
| `actions_taken` | jsonb | Stabilizer adjustments applied |

### seasons

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Season name |
| `start_at` | timestamp | Season start |
| `end_at` | timestamp | Season end |
| `is_active` | boolean | Currently active |
| `decay_threshold` | integer | Coin threshold for decay |
| `decay_rate` | numeric | Decay percentage |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

---

## 6. Communication Tables

### call_history

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `caller_id` | text (FK) | Caller user ID |
| `callee_id` | text (FK) | Callee user ID |
| `caller_country` | text | Caller's country |
| `callee_country` | text | Callee's country |
| `started_at` | timestamp | Call start time |
| `ended_at` | timestamp | Call end time |
| `duration_seconds` | integer | Call duration |
| `created_at` | timestamp | Record creation timestamp |

### notifications

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | Target user |
| `type` | text | Notification type |
| `payload` | jsonb | Type-specific data |
| `read` | boolean | Read status |
| `created_at` | timestamp | Creation timestamp |

### push_subscriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | Subscribing user |
| `endpoint` | text | Push service endpoint URL |
| `p256dh` | text | Client public key |
| `auth` | text | Authentication secret |
| `created_at` | timestamp | Subscription timestamp |

### reports

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `reporter_user_id` | text (FK) | Reporting user |
| `reported_user_id` | text (FK) | Reported user |
| `reason` | text | Report reason |
| `status` | text | `pending`, `reviewed`, `resolved`, `dismissed` |
| `admin_notes` | text | Admin notes on resolution |
| `created_at` | timestamp | Report timestamp |
| `updated_at` | timestamp | Last status change |

### report_contexts

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `report_id` | uuid (FK) | References reports.id |
| `context_data` | jsonb | Enriched context (user details, history) |
| `created_at` | timestamp | Creation timestamp |

### broadcast_history

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `title` | text | Broadcast title |
| `message` | text | Broadcast message |
| `url` | text | Associated URL |
| `created_by` | text | Admin who created |
| `target_count` | integer | Number of recipients |
| `created_at` | timestamp | Broadcast timestamp |

---

## 7. Reference Data Tables

### interest_tags

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Tag display name |
| `icon` | text | Icon identifier |
| `category` | text | Tag category |
| `deleted` | boolean | Soft delete flag |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### changelogs

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `version` | text | Version string |
| `title` | text | Changelog title |
| `content` | text | Markdown content |
| `published_at` | timestamp | Publication date |
| `created_by` | text | Author user ID |
| `created_at` | timestamp | Creation timestamp |

### level_rewards

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `level` | integer | Level at which reward is given |
| `coins` | integer | Coin reward amount |
| `description` | text | Reward description |
| `created_at` | timestamp | Creation timestamp |

### level_feature_unlocks

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `level` | integer | Required level |
| `feature_key` | text | Feature identifier |
| `name` | text | Display name |
| `description` | text | Feature description |
| `created_at` | timestamp | Creation timestamp |

### favorite_exp_boost_rules

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `one_way_multiplier` | numeric | EXP multiplier for one-way favorites |
| `mutual_multiplier` | numeric | EXP multiplier for mutual favorites |
| `is_active` | boolean | Whether this rule is active |
| `created_at` | timestamp | Creation timestamp |

### streak_exp_bonuses

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `min_streak` | integer | Minimum streak days |
| `max_streak` | integer | Maximum streak days |
| `bonus_multiplier` | numeric | EXP multiplier |
| `created_at` | timestamp | Creation timestamp |

### admin_config

| Column | Type | Description |
|--------|------|-------------|
| `key` | text | Config key (PK) |
| `value` | jsonb | Config value |
| `updated_at` | timestamp | Last update |

---

## 8. Embedding Table

### user_embeddings

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text (FK) | References users.id |
| `embedding` | vector | pgvector column |
| `model_name` | text | Embedding model identifier |
| `source_hash` | text | SHA-256 of input text |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last regeneration timestamp |

---

## 9. Database Views

| View | Description | Source Tables |
|------|-------------|--------------|
| `user_details_expanded` | User details with resolved interest tag names | user_details, interest_tags |
| `users_with_details` | Users joined with details | users, user_details |
| `public_user_info` | Public-facing user information (limited fields) | users, user_details |
| `user_favorites_with_stats` | Favorites with user stats | user_favorites, users |
| `admin_users_unified` | Admin view with all user data aggregated | users, user_details, user_levels, user_wallets |
| `changelogs_with_creator` | Changelogs with creator details | changelogs, users |

---

## 10. RPC Functions

| Function | Parameters | Returns | Side Effects |
|----------|-----------|---------|-------------|
| `increment_user_exp` | `p_user_id`, `p_amount` | void | Increments user_levels.total_exp_seconds |
| `increment_user_exp_daily` | `p_user_id`, `p_date`, `p_amount` | void | Increments user_exp_daily.exp_seconds |
| `increment_daily_exp_with_milestones` | `p_user_id`, `p_date`, `p_amount` | void | Increments daily EXP and manages milestone flags |
| `upsert_user_streak_day` | `p_user_id`, `p_date`, `p_seconds` | row | Upserts streak day, updates streak counters |
| `prepare_streak_freeze` | `p_user_id`, `p_date` | void | Prepares a freeze for the given gap date |
| `convert_exp_to_coin` | `p_user_id`, `p_exp_amount` | row | Deducts EXP, credits coins, records transaction |
| `purchase_shop_item` | `p_user_id`, `p_item_id` | row | Deducts coins, records purchase |
| `purchase_boost` | `p_user_id`, `p_boost_type` | row | Deducts coins, creates active boost |
| `claim_weekly_checkin` | `p_user_id` | row | Updates weekly streak, credits coins |
| `claim_monthly_checkin` | `p_user_id`, `p_day` | row | Claims day, credits coins |
| `claim_monthly_buyback` | `p_user_id`, `p_day` | row | Deducts EXP, claims past day, credits coins |
| `prestige_user` | `p_user_id` | row | Resets level, grants vault bonus, updates rank |
| `apply_user_seasonal_decay` | `p_user_id`, `p_season_id` | void | Applies coin decay above threshold |
| `snapshot_economy_metrics` | (none) | void | Aggregates and inserts daily economy metrics |
| `get_economy_stats` | (none) | row | Returns aggregate economy statistics |
| `find_similar_users_by_embedding` | `p_user_id`, `p_limit` | rows | pgvector similarity search |

---

## Related Components

- Economy system: [07-economy-system.md](07-economy-system.md)
- Caching layer: [10-caching-architecture.md](10-caching-architecture.md)
- API contracts: [14-api-contracts.md](14-api-contracts.md)

## Risk Considerations

- Service role bypasses RLS; all access control is application-level
- RPC functions contain business logic; changes require database migration
- No automated schema migration tool is documented in the repository
- Soft-deleted users accumulate without cleanup
- Economy RPC functions are atomic but not idempotent; duplicate calls may cause incorrect state
- pgvector indexes may need tuning as embedding count grows
