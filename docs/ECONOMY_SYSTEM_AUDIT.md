# LINKY ECONOMY SYSTEM V3 -- AUDIT REPORT

**Audit Date:** 2026-02-28
**Auditor:** Automated Systems Audit (Backend Economy Architecture)
**Scope:** Full read-only audit of migrations 014-027, all economy domain TypeScript services/routes, stabilizer context, economy config infrastructure, and admin endpoints.

---

## 1. Executive Summary

The Linky Economy System V3 represents a well-structured virtual economy with layered reward mechanics (EXP, coins, milestones, check-ins, prestige), multiple sink channels (shop, boosts, seasonal decay), and a config-driven stabilizer. The architecture follows domain-driven design with clear separation between earning, spending, and observation layers.

**Overall assessment: Solid foundation with targeted hardening needed.**

The system demonstrates strong transactional integrity at the database layer -- all coin-mutating operations use atomic PL/pgSQL functions with `FOR UPDATE` row locking, `CHECK` constraints prevent negative balances, and ledger entries are written alongside every balance mutation. The progressive conversion bonus, seasonal decay, and prestige mechanics create a defensible long-term economy loop.

However, the audit identifies three high-risk issues (dual EXP tracking gap, timezone manipulation surface, overly permissive table grants), five medium-risk concerns (hard-coded constants bypassing config, integer overflow edge case, month-end buyback arbitrage, missing config audit trail, lack of EXP transaction in `increment_user_exp`), and several low-risk observations around query performance and data model completeness.

No code modifications were made during this audit.

---

## 2. Compliance Matrix

| # | Component | Status | Notes | File References |
|---|-----------|--------|-------|-----------------|
| I | EXP Ledger System | **Partial** | `increment_daily_exp_with_milestones` writes to `user_exp_transactions`; `increment_user_exp` does NOT write a ledger entry. Two functions must be called in tandem for complete tracking. Negative EXP prevented by application-layer validation (`p_exp_seconds > 0`). No DB-level `CHECK` on `user_levels.total_exp_seconds >= 0`. | `025_prestige.sql` (lines 157-199), `027_economy_phase8.sql`, `015_daily_exp_rewards.sql` |
| II | Coin Wallet Consistency | **OK** | `CHECK (coin_balance >= 0)` enforced at DB. All mutations go through RPC functions that update wallet + write coin transaction atomically. `FOR UPDATE` locks prevent race conditions. No direct `coin_balance` mutation outside RPCs. | `014_coin_phase1.sql` (lines 12-25), all `purchase_*` / `convert_*` RPCs |
| III | Conversion System | **OK** | Progressive bonus tiers (5%/10%/15%) correct. `conversion_bonus_multiplier` from `economy_config` applied in phase 8 version. Integer arithmetic with `FLOOR` prevents precision drift. Config-driven in latest migration. | `027_economy_phase8.sql` (`convert_exp_to_coin`), `conversion.service.ts` |
| IV | Daily / Weekly / Monthly | **Partial** | Weekly resets on >1 day gap (correct). Monthly does not reset (correct). Monthly buyback consumes EXP (correct). Scaling buyback cost present. Duplicate prevention via `ALREADY_CLAIMED` exception. However, reward values are hard-coded in SQL, not config-driven. | `016_weekly_checkin.sql`, `017_monthly_checkin.sql`, `020_buyback_scaling.sql` |
| V | Level Rewards | **OK** | Level rewards table exists with admin CRUD. Coin grants via wallet upsert + ledger entry. Duplicate prevention by design (reward granted per level threshold). | `admin-level-rewards.service.ts`, `level-rewards.ts` |
| VI | Coin Sinks | **OK** | Shop purchases and boost purchases both deduct coins atomically, write negative `user_coin_transactions` entries. `ALREADY_OWNED` prevents duplicate cosmetic purchases. All burns fully logged. | `018_coin_shop.sql`, `019_boosts.sql`, `027_economy_phase8.sql` (`purchase_shop_item`) |
| VII | Seasonal System | **OK** | Soft reset decays only excess above threshold. Vault receives decay amount (not destroyed). `decay_processed` flag ensures idempotency. `seasonal_decay_rate` config-driven via `economy_config`. Vault balance non-convertible (no vault-to-coin RPC exists). | `027_economy_phase8.sql` (`apply_user_seasonal_decay`), `022_seasons.sql`, `023_seasonal_decay_rpc.sql` |
| VIII | Prestige | **Partial** | `lifetime_exp` correctly only-increases (updated in `increment_user_exp`). Prestige resets current EXP to 0. Vault bonus granted and logged. However, prestige threshold (`prestige_min_level`, `prestige_min_total_exp`) is read from config -- correct. `prestige_points_awarded` always logged as 0 in history table (misleading). No infinite loop guard beyond threshold check. | `025_prestige.sql` (`prestige_user` function) |
| IX | Economy Config | **Partial** | Config table exists and is used by conversion, milestone, cosmetic price, and seasonal decay multipliers. However, boost costs, weekly rewards, and monthly rewards remain hard-coded. Simulation constants also hard-coded in TypeScript. | `economy-config.ts`, `019_boosts.sql`, `016_weekly_checkin.sql`, `017_monthly_checkin.sql`, `admin-economy-simulate.service.ts` |
| X | Metrics and Stabilizer | **OK** | Daily aggregation via `snapshot_economy_metrics` captures supply, mint/burn, EXP generated/converted, active users, avg coin per user, top 10% ratio. Stabilizer adjusts multipliers within bounded ranges (`CONVERSION_BONUS_FLOOR = 0.5`, `COSMETIC_PRICE_CAP = 2.0`, `SEASONAL_DECAY_CAP = 0.8`). Health reports upserted daily. | `026_economy_metrics_extended.sql`, `economy-stabilizer.context.ts` |
| XI | Simulation Endpoint | **OK** | Pure calculation. No database mutations. Reads config values for multipliers, computes projected supply/mint/burn/inflation score. Input validated (days 1-365, userCount 1-10M). | `admin-economy-simulate.service.ts`, `economy-simulate.route.ts` |
| XII | Exploit and Risk | **Partial** | See Section 7 for full assessment. Key concerns: timezone manipulation, `anon` role grants, month-end buyback arbitrage. | Multiple files |

---

## 3. Risk Analysis

### 3.1 High Risk Issues

**H1: Dual-Function EXP Tracking Gap**

- **Location:** `increment_user_exp` (025_prestige.sql, lines 157-199), `increment_daily_exp_with_milestones` (027_economy_phase8.sql)
- **Description:** Two separate PL/pgSQL functions handle EXP grants, but neither is self-contained:
  - `increment_user_exp` updates `user_levels.total_exp_seconds` and `users.lifetime_exp`, computes prestige rank/tier, but writes NO entry to `user_exp_transactions`.
  - `increment_daily_exp_with_milestones` writes to `user_exp_daily` and `user_exp_transactions` but does NOT update `user_levels.total_exp_seconds` or `users.lifetime_exp`.
- **Impact:** If application code calls only one function, `user_levels.total_exp_seconds` and `user_exp_transactions` diverge. The ledger becomes unreliable for reconciliation. `lifetime_exp` may not track actual EXP earned.
- **Severity:** HIGH -- silent data inconsistency with no runtime error.

**H2: Timezone Manipulation Surface**

- **Location:** `weekly-checkin.route.ts` (getTimezone function), `monthly-checkin.route.ts` (getTimezone function)
- **Description:** The server accepts an arbitrary timezone via `x-user-timezone` header or `timezone` query param. The only validation is that it passes `isValidTimezone()`. The timezone is not persisted or anchored to the user's profile, meaning:
  - A user can send timezone `Pacific/Kiritimati` (UTC+14) to claim a check-in for "tomorrow" in their real location.
  - By toggling timezones between requests, a user could potentially claim the same calendar day twice (once as "today" in UTC-12, once as "today" in UTC+14).
- **Impact:** Double-claiming daily/weekly/monthly rewards. Up to 2 coins (weekly day 1) or 80 coins (monthly last day) per exploit.
- **Severity:** HIGH -- exploitable by any authenticated user with no tooling required.

**H3: `economy_config` GRANT ALL to `anon` Role**

- **Location:** `025_prestige.sql` (end of file)
- **Description:** `GRANT ALL ON TABLE "public"."economy_config" TO "anon"` gives the anonymous Supabase role full read/write access at the PostgreSQL level. Unless Row Level Security (RLS) policies explicitly deny anonymous writes, any client with the Supabase anon key can directly mutate economy parameters via PostgREST.
- **Impact:** An attacker could set `conversion_bonus_multiplier` to an arbitrarily high value, set `prestige_min_level` to 1, disable stabilization, or set `seasonal_decay_rate` to 0 -- effectively breaking the entire economy.
- **Severity:** HIGH -- depends on RLS configuration. If RLS is not enabled on `economy_config`, this is a critical vulnerability.

---

### 3.2 Medium Risk Issues

**M1: Boost Pricing Hard-Coded in SQL**

- **Location:** `019_boosts.sql`, `purchase_boost` function (lines 32-51)
- **Description:** Boost costs (120 coins for `exp_boost_30m`, 80 coins for `daily_reward_multiplier`), durations (30 min, 24 hours), and multipliers (1.2x, 2.0x) are all embedded as CASE expressions in the SQL function. They are not read from `economy_config`.
- **Impact:** The stabilizer cannot dynamically adjust boost pricing or effectiveness in response to inflation signals. Manual migration is required to change values.

**M2: Weekly and Monthly Reward Schedules Hard-Coded**

- **Location:** `016_weekly_checkin.sql` (CASE expression, lines 77-86), `017_monthly_checkin.sql` (`monthly_reward_for_day` function, lines 38-55)
- **Description:** Weekly check-in rewards (2/3/4/5/6/8/18 coins) and monthly per-day rewards (formula-based + 80 for last day) are directly coded in SQL functions. Not driven by `economy_config`.
- **Impact:** Cannot be tuned by the stabilizer or admin without deploying a migration.

**M3: Integer Overflow in EXP Transaction Ledger**

- **Location:** `014_coin_phase1.sql` (line 52: `"amount" integer NOT NULL`), `convert_exp_to_coin` function
- **Description:** `user_exp_transactions.amount` is defined as `INTEGER` (max 2,147,483,647). The conversion function casts `-(p_exp_amount)::integer` where `p_exp_amount` is `BIGINT`. If a user accumulates > 2.1 billion EXP seconds (~68 years of continuous use) and converts it all at once, the cast overflows silently.
- **Impact:** Unlikely in practice given realistic usage, but no guard exists. Could corrupt the ledger.

**M4: Month-End Buyback Arbitrage**

- **Location:** `017_monthly_checkin.sql`, `monthly_reward_for_day` and `buyback_cost_for_index` functions
- **Description:** The last day of any month awards 80 coins. Buyback cost caps at 800 EXP (3rd+ buyback). Via direct conversion, 800 EXP yields 8 coins (at 100:1 base rate). Via buyback of the last day, 800 EXP yields 80 coins -- a 10x multiplier. Users who deliberately skip the last day and buy it back gain disproportionate value.
- **Impact:** Systematic coin inflation for users who exploit this pattern. Partially mitigated by the buyback count limit per month but the ROI disparity remains.

**M5: No Config Change Audit Trail**

- **Location:** `economy-config.ts` (`setEconomyConfigValue` function)
- **Description:** Config changes are applied via a simple `UPSERT` with no history table tracking who changed what, when, and from what value. The stabilizer logs its actions in `economy_health_reports.actions_taken` (JSONB), but manual admin changes leave no trace.
- **Impact:** No forensic capability to investigate unauthorized or erroneous config changes.

---

### 3.3 Low Risk Issues

**L1: Full Table Scans in Aggregate Functions**

- **Location:** `get_economy_stats` (021_economy_stats_rpc.sql), `snapshot_economy_metrics` (026_economy_metrics_extended.sql)
- **Description:** Both functions aggregate over the entire `user_coin_transactions` and `user_exp_transactions` tables without partitioning or running totals. As transaction volume grows, these queries will degrade.

**L2: Missing Index on `user_coin_transactions.type`**

- **Location:** `014_coin_phase1.sql`, `021_economy_stats_rpc.sql`
- **Description:** `get_economy_stats` queries `WHERE type IN ('shop_purchase', 'boost_purchase')`. No index exists on the `type` column. Currently indexed on `user_id` and `created_at` only.

**L3: Misleading `prestige_points_awarded` Column**

- **Location:** `025_prestige.sql` (`prestige_user` function, `user_prestige_history` table)
- **Description:** The `prestige_points_awarded` column in `user_prestige_history` is always inserted as `0`. Prestige points are derived from `lifetime_exp / prestige_divisor` and updated on the `users` table directly. The history column serves no analytical purpose in its current state.

**L4: Simulation Constants Not Config-Driven**

- **Location:** `admin-economy-simulate.service.ts`
- **Description:** `ESTIMATED_BURN_RATIO = 0.35`, `BASELINE_COIN_TARGET = 500`, and `ESTIMATED_DAILY_MILESTONE_COINS_PER_USER = 4` are TypeScript constants. Changing them requires a code deployment rather than a config update.

**L5: Expired Boosts Not Cleaned Up**

- **Location:** `019_boosts.sql`, `user_active_boosts` table
- **Description:** The `user_active_boosts` table has no automated cleanup of expired rows. Queries filter by `expires_at > now()`, but expired rows accumulate indefinitely. No TTL, scheduled job, or trigger removes them.

**L6: `user_exp_daily` Lacks `FOR UPDATE` Lock**

- **Location:** `increment_daily_exp_with_milestones` function (all versions)
- **Description:** The function uses `ON CONFLICT DO UPDATE` for the upsert but does not acquire a `FOR UPDATE` lock before reading milestone flags. Under high concurrency (rare for per-user operations), two simultaneous calls could both read `milestone_600_claimed = false` and both attempt the milestone grant. The secondary `GET DIAGNOSTICS` check mitigates this for the UPDATE, but the coin insert could theoretically execute twice if the UPDATE race window is hit.

---

## 4. Inflation Risk Evaluation

### 4.1 Current Supply Sustainability

The economy has multiple mint channels and limited sink channels:

**Mint Sources (coins entering circulation):**

| Source | Rate per User per Day (approx) | Config-Driven |
|--------|-------------------------------|---------------|
| EXP Conversion (base) | Variable, up to 100 coins/day for heavy users | Yes |
| EXP Conversion (bonus) | Up to 15% of base | Yes |
| Daily Milestones (600/1800/3600s) | 2 + 6 + 12 = 20 coins max | Partially (multiplier, but base values hard-coded) |
| Weekly Check-in | 2-18 coins/day (avg ~6.6/day) | No |
| Monthly Check-in | 2-80 coins/day (avg ~5/day) | No |
| Level Rewards | Sporadic, per level threshold | Admin-managed |
| Prestige Vault Bonus | One-time per prestige cycle | Yes (multiplier) |

**Burn Sinks (coins leaving circulation):**

| Sink | Mechanism | Config-Driven |
|------|-----------|---------------|
| Shop Purchases | Permanent burn (cosmetics) | Partially (price multiplier) |
| Boost Purchases | Temporary consumable burn | No (hard-coded costs) |
| Seasonal Decay | Moves excess to vault (not true burn) | Yes |

### 4.2 Mint vs Burn Balance

The stabilizer monitors the mint-to-burn ratio and triggers corrective action when minting exceeds burning by a factor of 1.3x for 7 consecutive days. However:

- Seasonal decay moves coins to vault rather than destroying them. This reduces circulating supply but does not reduce total supply. Vault coins are permanently locked (no withdrawal mechanism exists), so they function as a soft burn.
- The stabilizer can reduce `conversion_bonus_multiplier` (floor: 0.5x), increase `cosmetic_price_multiplier` (cap: 2.0x), and increase `seasonal_decay_rate` (cap: 0.8). These are meaningful but bounded levers.
- The stabilizer cannot adjust boost pricing, weekly rewards, monthly rewards, or daily milestone base values. These represent a significant portion of the mint supply that is outside stabilizer control.

### 4.3 Long-Term Projection

Using the simulation model's default parameters:
- With 1000 users, 3600 avg EXP/day, over 90 days: projected net supply grows linearly because sinks are proportionally weaker than mints.
- The `ESTIMATED_BURN_RATIO` of 0.35 in the simulation assumes 35% of minted coins are burned, which requires active cosmetic shop engagement. If shop catalog is sparse, actual burn will be lower.
- Without continuous addition of desirable shop items or introduction of additional sinks, the economy will trend inflationary over 6+ months.

**Recommendation:** The current design is sustainable for early-stage operation (< 10K users, < 6 months) but will require additional sink mechanics or reduced minting for long-term health.

---

## 5. Transaction Integrity Review

### 5.1 Atomicity

All critical operations are implemented as single PL/pgSQL functions, ensuring they execute within a single database transaction:

| Operation | Atomic | Mechanism |
|-----------|--------|-----------|
| EXP to Coin Conversion | Yes | `convert_exp_to_coin` RPC: deducts EXP, upserts wallet, writes both ledger entries in one function |
| Shop Purchase | Yes | `purchase_shop_item` RPC: deducts coins, writes ledger, grants item ownership in one function |
| Boost Purchase | Yes | `purchase_boost` RPC: deducts coins, writes ledger, creates boost record in one function |
| Weekly Check-in | Yes | `claim_weekly_checkin` RPC: upserts streak, grants coins, writes ledger in one function |
| Monthly Check-in | Yes | `claim_monthly_checkin` RPC: validates day, grants coins, updates claimed_days array in one function |
| Monthly Buyback | Yes | `claim_monthly_buyback` RPC: validates day, deducts EXP, grants coins, increments buyback_count in one function |
| Seasonal Decay | Yes | `apply_user_seasonal_decay` RPC: deducts coins, credits vault, writes two ledger entries, marks processed in one function |
| Prestige | Yes | `prestige_user` RPC: resets EXP/level, increments total_prestiges, grants vault bonus, logs history in one function |
| Daily EXP + Milestones | Yes | `increment_daily_exp_with_milestones` RPC: upserts daily EXP, writes EXP ledger, conditionally grants milestones in one function |

**Verdict: All coin-mutating paths are transactionally atomic.** No application-layer multi-step sequences risk partial completion.

### 5.2 Ledger Consistency

- **Coin Ledger (`user_coin_transactions`):** Every function that modifies `user_wallets.coin_balance` also inserts a corresponding `user_coin_transactions` row. Verified across all 9 mutating RPCs. Ledger is append-only (no UPDATE or DELETE operations on this table in any migration or service).
- **EXP Ledger (`user_exp_transactions`):** Written by `increment_daily_exp_with_milestones`, `convert_exp_to_coin`, and `claim_monthly_buyback`. NOT written by `increment_user_exp`. This is the gap identified in H1.

### 5.3 Edge Case Validation

| Edge Case | Handled | Mechanism |
|-----------|---------|-----------|
| Convert 0 EXP | Yes | `p_exp_amount < 100` check |
| Convert non-multiple of 100 | Yes | `p_exp_amount % 100 != 0` check |
| Convert more EXP than balance | Yes | `INSUFFICIENT_EXP` exception after `FOR UPDATE` lock |
| Purchase item already owned | Yes | `ALREADY_OWNED` exception |
| Purchase with 0 coins | Yes | `INSUFFICIENT_COINS` exception |
| Claim weekly twice same day | Yes | `ALREADY_CLAIMED` exception via date comparison |
| Claim monthly future day | Yes | `FUTURE_DAY` exception |
| Buyback today or future | Yes | `BUYBACK_FUTURE_OR_TODAY` exception |
| Prestige below threshold | Yes | `PRESTIGE_THRESHOLD_NOT_MET` exception |
| Seasonal decay already processed | Yes | Early return if `decay_processed = true` |
| Seasonal decay before season ends | Yes | `SEASON_NOT_EXPIRED` exception |
| Negative EXP after conversion | Partial | Application validates `expAmount > 0`, DB checks `v_current_exp < p_exp_amount`, but no `CHECK` constraint on `user_levels.total_exp_seconds >= 0` |

---

## 6. Performance Review

### 6.1 Query Efficiency

**Efficient patterns observed:**
- All per-user operations use indexed `user_id` lookups with `FOR UPDATE` -- O(1) via unique index.
- `user_exp_daily` uses composite unique index on `(user_id, date)` -- efficient for daily lookups.
- `user_monthly_checkins` uses composite unique constraint on `(user_id, year, month)` -- efficient for monthly lookups.
- Shop item lookup uses primary key index on `id` with `FOR UPDATE`.

**Inefficient patterns observed:**
- `get_economy_stats()` performs 5 separate aggregate queries over full tables (`user_wallets`, `user_coin_transactions`, `user_exp_transactions`). At scale (> 1M transactions), each `SUM()` requires a full sequential scan.
- `snapshot_economy_metrics()` performs 7+ aggregate queries including `NTILE(10) OVER (ORDER BY coin_balance DESC)` window function over all wallets -- O(n log n).
- Daily burn rate in `get_economy_stats` filters by `type IN ('shop_purchase', 'boost_purchase') AND created_at >= now() - interval '24 hours'` without a composite index on `(type, created_at)`.

### 6.2 Missing Indexes

| Table | Recommended Index | Justification |
|-------|------------------|---------------|
| `user_coin_transactions` | `(type, created_at)` | Used by `get_economy_stats` for daily burn rate query |
| `user_coin_transactions` | `(user_id, created_at)` composite | Used by `snapshot_economy_metrics` for active user count |
| `user_active_boosts` | Already indexed on `(user_id, expires_at)` | Adequate |

### 6.3 Potential Bottlenecks

1. **Transaction ledger growth:** Both `user_coin_transactions` and `user_exp_transactions` are append-only with no archival strategy. At 10K DAU with ~10 transactions/user/day, this grows by ~100K rows/day (36.5M/year). Aggregate queries will degrade proportionally.
2. **`snapshot_economy_metrics` window function:** The NTILE(10) computation requires sorting all wallets by balance. At 100K+ wallets this becomes expensive for a daily job.
3. **Stabilizer reads 8 metric rows:** This is efficient and well-bounded.
4. **Config reads:** Each `getEconomyConfigValue` call makes a separate Supabase query. In `increment_daily_exp_with_milestones` (027 version), three separate config reads occur per EXP grant. These could be batched.

---

## 7. Exploit Surface Assessment

### 7.1 Attack Vectors

**AV1: Timezone Manipulation (Exploitable)**
- **Vector:** Authenticated user sends `x-user-timezone: Pacific/Kiritimati` (UTC+14) to weekly/monthly check-in endpoints.
- **Result:** Can claim rewards for a date that has not yet arrived in their real timezone. By alternating timezones between requests, may be able to claim the same logical day twice.
- **Mitigation required:** Anchor timezone to user profile, or use server-side UTC date for all reward gating.

**AV2: Direct PostgREST Access to `economy_config` (Conditional)**
- **Vector:** If RLS is not enabled on `economy_config`, any client with the Supabase anon key can call `PATCH /rest/v1/economy_config?key=eq.conversion_bonus_multiplier` with `{"value_json": 999}`.
- **Result:** Arbitrary manipulation of all economy parameters.
- **Mitigation required:** Enable RLS on `economy_config` with deny-all policy for `anon` and `authenticated` roles, or revoke `anon`/`authenticated` grants.

**AV3: Direct PostgREST Access to RPC Functions (Conditional)**
- **Vector:** All economy RPC functions (`convert_exp_to_coin`, `purchase_shop_item`, `purchase_boost`, `claim_weekly_checkin`, `claim_monthly_checkin`, `claim_monthly_buyback`, `prestige_user`) are granted `EXECUTE` to `anon`, `authenticated`, and `service_role`. A user with direct PostgREST access could call these RPCs with arbitrary `p_user_id` parameters, operating on other users' accounts.
- **Result:** Impersonation of any user for economy operations.
- **Mitigation required:** RLS policies or function-level `SECURITY DEFINER` with internal auth checks to ensure `p_user_id` matches the calling user.

**AV4: Race Condition in Daily Milestone Grants (Theoretical)**
- **Vector:** Two concurrent calls to `increment_daily_exp_with_milestones` for the same user/date could both read `milestone_600_claimed = false` and both attempt the grant.
- **Result:** The `GET DIAGNOSTICS v_updated = ROW_COUNT` check after the conditional UPDATE provides protection -- only one concurrent writer will see `ROW_COUNT > 0`. However, the check happens after the UPDATE, meaning both transactions would attempt the UPDATE but only one would match the `WHERE NOT milestone_600_claimed` condition.
- **Actual risk:** Low. The pattern is functionally safe due to the conditional UPDATE. Double coin grant is prevented.

**AV5: EXP Transaction Amount Overflow (Theoretical)**
- **Vector:** A user with > 2.1 billion EXP seconds converts it all at once.
- **Result:** The `-(p_exp_amount)::integer` cast in the EXP ledger entry overflows, recording an incorrect amount.
- **Actual risk:** Extremely low. 2.1B seconds = ~68 years of continuous video chat.

### 7.2 Abuse Possibilities

**AB1: Month-End Buyback Farming**
- **Method:** User deliberately skips the last day of month check-in, then buys it back for 800 EXP (3rd+ buyback) to receive 80 coins.
- **ROI:** 10x compared to direct EXP-to-coin conversion (800 EXP = 8 coins via conversion, 80 coins via buyback).
- **Frequency:** Once per month per user. Impact is bounded but creates perverse incentive.

**AB2: Boost Stacking for EXP Amplification**
- **Method:** Purchase `exp_boost_30m` (1.2x multiplier for 30 minutes) and `daily_reward_multiplier` (2.0x for 24 hours) simultaneously.
- **Result:** EXP is amplified by 1.2x, and daily milestone rewards are doubled. Combined with high-activity sessions, this amplifies both EXP earning and coin rewards.
- **Assessment:** This is likely intentional by design. Both boosts cost coins (120 + 80 = 200 coins), creating a meaningful sink. The amplification is bounded and temporary.

**AB3: Multi-Device Concurrent EXP Grants**
- **Method:** If the application allows multiple simultaneous video chat sessions per user, EXP grants could fire concurrently.
- **Result:** Multiple `increment_daily_exp_with_milestones` calls in parallel. As analyzed in AV4, milestone double-grant is prevented by conditional UPDATE, but `user_exp_daily.exp_seconds` could receive both increments (which may be intended behavior).

---

## 8. Recommended Improvements (Non-Breaking)

### 8.1 Safe Improvements (No Schema Changes Required)

1. **Anchor user timezone to profile:** Store the user's timezone in `user_details` on first check-in request. Subsequent requests should use the stored timezone, or at minimum, reject timezone changes that would result in a date shift allowing double-claims.

2. **Add RLS policies to `economy_config`:** Create a deny-all RLS policy for `anon` and `authenticated` roles on `economy_config`. Only `service_role` should have write access.

3. **Add RLS policies or restrict grants on RPC functions:** Ensure economy RPCs called via PostgREST validate that the `p_user_id` parameter matches the authenticated user's ID, or revoke `EXECUTE` from `anon` role on sensitive functions.

4. **Add `user_exp_transactions` write to `increment_user_exp`:** Insert a ledger entry with type `'call_duration'` inside `increment_user_exp` to maintain ledger completeness. This keeps the function self-contained.

5. **Batch config reads:** In `increment_daily_exp_with_milestones` (027 version), the three `economy_config` lookups could be combined into a single query with `WHERE key IN (...)` to reduce round trips.

### 8.2 Hardening Suggestions (May Require Minor Schema Changes)

6. **Add `CHECK (total_exp_seconds >= 0)` constraint to `user_levels`:** Prevents the theoretical case where a conversion or prestige reset drives EXP negative due to a bug.

7. **Move boost pricing to `economy_config`:** Insert `boost_exp_30m_cost`, `boost_daily_reward_cost`, `boost_exp_30m_multiplier`, `boost_daily_reward_multiplier` into `economy_config`. Modify `purchase_boost` to read from config instead of hard-coded CASE.

8. **Create `economy_config_history` table:** Track changes with columns `(key, old_value, new_value, changed_by, changed_at)`. Modify `setEconomyConfigValue` to insert a history row before upserting.

9. **Add composite index `(type, created_at)` on `user_coin_transactions`:** Improves `get_economy_stats` burn rate query performance at scale.

10. **Add expired boost cleanup job:** Schedule a periodic job to `DELETE FROM user_active_boosts WHERE expires_at < now() - interval '7 days'` to prevent table bloat.

11. **Cap single conversion amount in application layer:** Add a maximum `expAmount` check (e.g., 1,000,000) in `conversion.service.ts` to prevent the integer overflow edge case.

12. **Reduce month-end buyback reward or increase buyback cost:** Consider capping the buyback reward to the average daily rate when used via buyback, or scaling the buyback cost proportionally to the reward value.

---

## 9. Final Health Score

### Score: 78 / 100

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Transaction Integrity | 25% | 90 | 22.5 |
| Ledger Completeness | 15% | 70 | 10.5 |
| Security (Grants/RLS) | 20% | 60 | 12.0 |
| Config-Driven Design | 15% | 65 | 9.75 |
| Inflation Control | 10% | 75 | 7.5 |
| Performance | 10% | 80 | 8.0 |
| Exploit Resistance | 5% | 55 | 2.75 |
| | | **Total** | **73.0** |

**Adjusted Score: 78** (bonus for overall architecture quality, domain separation, and atomic RPC design pattern that exceeds typical virtual economy implementations)

### Score Breakdown

- **Transaction Integrity (90/100):** All coin mutations are atomic. `FOR UPDATE` locking is consistent. `CHECK` constraints prevent negative balances. Minor deduction for missing `CHECK` on `total_exp_seconds`.
- **Ledger Completeness (70/100):** Coin ledger is complete and append-only. EXP ledger has a gap in `increment_user_exp`. `prestige_points_awarded` always 0 in history.
- **Security (60/100):** `GRANT ALL` to `anon` on critical tables and functions is a significant concern. Depends entirely on RLS configuration not audited here. Timezone manipulation is exploitable without additional controls.
- **Config-Driven Design (65/100):** Core conversion and decay multipliers are config-driven. Boost pricing, weekly rewards, monthly rewards, and simulation constants are not.
- **Inflation Control (75/100):** Stabilizer design is sound with bounded adjustment ranges. Multiple mint sources outside stabilizer control. Seasonal decay is a soft sink (vault, not burn). Long-term sustainability depends on shop catalog depth.
- **Performance (80/100):** Per-user operations are efficient. Aggregate functions will degrade at scale. Missing composite indexes for type-filtered queries.
- **Exploit Resistance (55/100):** Timezone manipulation and PostgREST direct access are viable attack surfaces. Month-end buyback arbitrage creates perverse incentives.

---

*End of audit report. No code was modified during this assessment.*
