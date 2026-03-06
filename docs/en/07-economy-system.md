# 07 -- Economy System

## Purpose

This document describes the complete virtual economy of the Linky platform, including the dual-currency model (EXP and Coins), wallet management, conversion mechanics, shop system, boost system, daily/weekly/monthly engagement loops, prestige system, seasonal decay, and the automated economy stabilizer.

## Scope

Covers domains: `economy`, `economy-shop`, `economy-boost`, `economy-daily`, `economy-weekly`, `economy-monthly`, `economy-season`, `economy-prestige`, and the `economy-stabilizer.context.ts`.

## Dependencies

- [02-architecture.md](02-architecture.md) for domain model
- [04-video-chat-system.md](04-video-chat-system.md) for EXP generation via calls

## Cross References

- [09-admin-system.md](09-admin-system.md) for economy admin tools
- [12-database-schema.md](12-database-schema.md) for economy tables
- [19-scalability-strategy.md](19-scalability-strategy.md) for economy scaling

---

## 1. Currency Model

### 1.1 Dual Currency

| Currency | Generation | Usage | Decay |
|----------|-----------|-------|-------|
| **EXP** | Earned via call duration (1 second = 1 EXP base, modified by multipliers) | Converted to Coins, used for monthly buybacks | No decay |
| **Coin** | Obtained by converting EXP, daily/weekly/monthly rewards, level-up rewards | Shop purchases, boost purchases | Subject to seasonal decay (above threshold) |

### 1.2 Wallet Structure

Table: `user_wallets`

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | text | User identifier |
| `coin_balance` | integer | Available coin balance |
| `vault_coin_balance` | integer | Protected coins (immune to decay) |
| `total_earned` | integer | Lifetime coins earned |
| `total_spent` | integer | Lifetime coins spent |

### 1.3 Coin Transaction Types

```
"exp_conversion"    -- Coins from converting EXP
"level_reward"      -- Coins granted on level-up
"admin_adjustment"  -- Manual admin coin adjustment
"shop_purchase"     -- Coins spent in shop
"boost_purchase"    -- Coins spent on boosts
"seasonal_decay"    -- Coins removed by seasonal decay
"vault_deposit"     -- Coins moved to vault (via prestige)
```

---

## 2. EXP Generation

### 2.1 Base EXP

EXP is generated from call duration: `base_exp = duration_seconds`

### 2.2 Multiplier Stack

EXP multipliers are applied in sequence:

1. **Streak Bonus**: If user has an active streak, the `streak_exp_bonuses` table provides a multiplier based on streak length
2. **Favorite EXP Boost**: If the call is between favorites:
   - Mutual favorites: `mutual_multiplier` (from `favorite_exp_boost_rules`)
   - One-way favorite: `one_way_multiplier`
   - No favorite relationship: 1.0 (no bonus)

Final EXP: `floor(duration_seconds * streak_multiplier * favorite_multiplier)`

### 2.3 Daily EXP Milestones

Table: `user_exp_daily`

Three daily milestones tracked per user per local date:

| Milestone | Threshold (seconds) | Description |
|-----------|---------------------|-------------|
| 600 | 10 minutes total | First daily milestone |
| 1800 | 30 minutes total | Second daily milestone |
| 3600 | 60 minutes total | Third daily milestone |

Each milestone can be claimed once per day. Milestone status is tracked via `milestone_600_claimed`, `milestone_1800_claimed`, `milestone_3600_claimed` boolean columns.

EXP is accumulated via `increment_daily_exp_with_milestones` RPC which atomically increments the daily total and manages milestone flags.

---

## 3. EXP-to-Coin Conversion

Location: `apps/api/src/domains/economy/service/conversion.service.ts`

### 3.1 Rules

- Minimum conversion: 100 EXP
- Must be a multiple of 100
- Must be a positive integer

### 3.2 RPC: `convert_exp_to_coin`

Parameters: `p_user_id`, `p_exp_amount`

The database function:
1. Validates the user has sufficient EXP
2. Deducts EXP from user's total
3. Calculates base coins + bonus coins (affected by `conversion_bonus_multiplier` config)
4. Credits coins to wallet
5. Records transaction in `user_coin_transactions`
6. Returns: `{ exp_spent, base_coins, bonus_coins, total_coins, new_coin_balance }`

Errors: `INSUFFICIENT_EXP`, `INVALID_AMOUNT`

---

## 4. Shop System

Location: `apps/api/src/domains/economy-shop/service/shop.service.ts`

### 4.1 Shop Items

Table: `shop_items` (accessed via repository)

Items have: `id`, `key`, `name`, `type`, `price`, `metadata`, `is_active`

### 4.2 Purchase Flow

RPC: `purchase_shop_item(p_user_id, p_item_id)`

1. Validates item exists and is active
2. Checks user doesn't already own item
3. Checks sufficient coin balance
4. Deducts coins
5. Records purchase
6. Returns: `{ new_coin_balance }`

Errors: `ITEM_NOT_FOUND`, `ALREADY_OWNED`, `INSUFFICIENT_COINS`

---

## 5. Boost System

Location: `apps/api/src/domains/economy-boost/service/boost.service.ts`

### 5.1 Boost Types

| Type | Cost (Coins) | Duration | Multiplier |
|------|-------------|----------|------------|
| `exp_boost_30m` | 120 | 30 minutes | 1.2x EXP |
| `daily_reward_multiplier` | 80 | 24 hours | 2.0x daily rewards |

### 5.2 Purchase Flow

RPC: `purchase_boost(p_user_id, p_boost_type)`

1. Validates boost type
2. Checks sufficient coins
3. Deducts coins
4. Creates active boost record with expiration
5. Returns: `{ expires_at, new_coin_balance }`

Errors: `INVALID_BOOST_TYPE`, `INSUFFICIENT_COINS`

---

## 6. Weekly Check-In System

Location: `apps/api/src/domains/economy-weekly/service/weekly-checkin.service.ts`

### 6.1 Reward Schedule

| Day | Reward (Coins) |
|-----|---------------|
| 1 | 2 |
| 2 | 3 |
| 3 | 4 |
| 4 | 5 |
| 5 | 6 |
| 6 | 8 |
| 7 | 18 |

Total per week: 46 coins

### 6.2 Mechanics

- Users can check in once per local date
- Streak resets to day 1 after completing day 7 or missing a day
- RPC: `claim_weekly_checkin(p_user_id)`
- Error: `ALREADY_CLAIMED`

---

## 7. Monthly Check-In System

Location: `apps/api/src/domains/economy-monthly/service/monthly-checkin.service.ts`

### 7.1 Calendar-Based Rewards

Each day of the month offers a coin reward:

```
Days 1-25:  2 + floor(((day - 1) * 3) / 24) coins
Days 26-30: min(6 + (day - 26), 10) coins
Last day:   80 coins (jackpot)
```

### 7.2 Buyback Mechanics

Users can buy back missed days using EXP:

```
buybackCost(count) = min(300 + count * 100, 800) EXP
```

Where `count` is the number of buybacks already used this month.

- Buyback is only available for past days (not today or future)
- RPC: `claim_monthly_buyback(p_user_id, p_day)`
- Errors: `ALREADY_CLAIMED`, `INVALID_DAY`, `BUYBACK_FUTURE_OR_TODAY`, `INSUFFICIENT_EXP`, `NO_MONTHLY_RECORD`

---

## 8. Prestige System

Location: `apps/api/src/domains/economy-prestige/prestige.service.ts`

### 8.1 Prestige Ranks

```
plastic → bronze → silver → gold → platinum →
diamond → immortal → ascendant → eternal →
mythic → celestial → transcendent
```

### 8.2 Prestige Flow

RPC: `prestige_user(p_user_id)`

1. Validates user meets prestige threshold (level/EXP requirement)
2. Resets user's level/EXP
3. Increments total prestige count
4. Calculates vault bonus (coins protected from decay)
5. Determines new prestige rank and tier
6. Returns: `{ vault_bonus, new_total_prestiges, prestige_rank, prestige_tier }`

Errors: `PRESTIGE_THRESHOLD_NOT_MET`, `USER_NOT_FOUND`

---

## 9. Seasonal System

### 9.1 Season Structure

Table: `seasons`

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Season identifier |
| `name` | text | Season display name |
| `start_at` | timestamp | Season start date |
| `end_at` | timestamp | Season end date |
| `is_active` | boolean | Currently active season |
| `decay_threshold` | integer | Coin balance above which decay applies (default: 500) |
| `decay_rate` | decimal | Percentage of excess coins decayed (default: 0.3) |

Constraint: Only one season can be active at a time.

### 9.2 Seasonal Decay

Location: `apps/api/src/domains/economy-season/service/seasonal-decay.service.ts`

When a season expires:
1. `getPendingUserIdsForSeason(seasonId)` identifies users not yet processed
2. For each user: `apply_user_seasonal_decay(p_user_id, p_season_id)` RPC
   - Calculates excess coins above threshold
   - Applies decay rate to excess
   - Vault coins are exempt
   - Records decay transaction

---

## 10. Economy Stabilizer

Location: `apps/api/src/contexts/economy-stabilizer.context.ts`

### 10.1 Purpose

The stabilizer is an automated system that monitors economy health metrics and adjusts configuration parameters to maintain economic stability.

### 10.2 Constants

```
CONVERSION_BONUS_FLOOR = 0.5
COSMETIC_PRICE_CAP = 2.0
SEASONAL_DECAY_CAP = 0.8
MINT_BURN_RATIO_THRESHOLD = 1.3
TOP_10_RATIO_THRESHOLD = 0.65
CONSECUTIVE_DAYS_REQUIRED = 7
```

### 10.3 Stabilizer Rules

The stabilizer reads the last 8 days from `economy_metrics_daily` and applies:

**Rule 1: Inflation Protection**
- Trigger: 7 consecutive days where daily minted > daily burned * 1.3
- Action: Reduce `conversion_bonus_multiplier` by 0.02 (floor: 0.5)

**Rule 2: Average Coin Cap**
- Trigger: `avg_coin_per_user` exceeds configured cap
- Action: Increase `cosmetic_price_multiplier` by 0.05 (cap: 2.0)

**Rule 3: Whale Dominance**
- Trigger: Top 10% of users hold > 65% of total coin supply
- Action: Increase `seasonal_decay_rate` by 0.05 (cap: 0.8)

### 10.4 Health Classification

```
classifyHealth(metrics):
  - If top_10_percent_ratio > 0.65 → "whale_dominance"
  - If mint > burn * 1.3 → "inflation_risk"
  - If burn > mint * 1.3 → "deflation_risk"
  - Otherwise → "stable"
```

### 10.5 Health Report

After each run, the stabilizer writes to `economy_health_reports`:
- `date` -- Report date
- `health_status` -- Classification result
- `metrics_snapshot` -- Current economy metrics
- `actions_taken` -- Array of parameter adjustments made

### 10.6 Feature Flag

The stabilizer can be disabled via `economy_config` table key `stabilization_enabled`.

---

## 11. Economy Metrics Snapshot

RPC: `snapshot_economy_metrics`

Records daily aggregate metrics to `economy_metrics_daily`:
- `total_coin_supply`
- `total_vault_supply`
- `total_coin_minted`
- `total_coin_burned`
- `total_exp_generated`
- `total_exp_converted`
- `active_users_count`
- `avg_coin_per_user`
- `top_10_percent_ratio`

---

## 12. Economic Invariants

1. **Coin conservation**: Total minted = total burned + total in circulation (wallets + vaults)
2. **EXP monotonicity**: Total EXP generated always increases (no EXP destruction except via conversion)
3. **Vault immunity**: Vault coins are never subject to seasonal decay
4. **Atomic transactions**: All coin mutations occur within database RPC functions to ensure consistency
5. **Single active season**: Only one season can be active at any time
6. **Prestige reset**: Prestige resets level/EXP but preserves coins and vault

---

## Related Components

- Level system: [12-database-schema.md](12-database-schema.md) (user_levels table)
- Admin economy tools: [09-admin-system.md](09-admin-system.md)
- Call EXP generation: [04-video-chat-system.md](04-video-chat-system.md)

## Risk Considerations

- Economy stabilizer runs as a background job; failure leaves economy untuned until next run
- Seasonal decay is irreversible once applied
- Conversion bonus multiplier can only decrease via stabilizer (no automatic recovery from deflation)
- Monthly jackpot (80 coins on last day) creates end-of-month coin spikes
- Buyback cost escalation (300-800 EXP) may create EXP sink imbalance
- Prestige threshold is managed within the RPC; changing it requires database migration
