ALTER TABLE "public"."economy_metrics_daily"
  ADD COLUMN IF NOT EXISTS "total_exp_generated" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_exp_converted" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "active_users_count" bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avg_coin_per_user" numeric(18,4),
  ADD COLUMN IF NOT EXISTS "top_10_percent_ratio" numeric(5,4);

COMMENT ON COLUMN "public"."economy_metrics_daily"."total_exp_generated" IS 'Lifetime sum of positive EXP transaction amounts.';
COMMENT ON COLUMN "public"."economy_metrics_daily"."total_exp_converted" IS 'Lifetime sum of EXP burned (negative amounts) from conversions.';
COMMENT ON COLUMN "public"."economy_metrics_daily"."active_users_count" IS 'Distinct users with at least one coin transaction in the last 24h at snapshot time.';
COMMENT ON COLUMN "public"."economy_metrics_daily"."avg_coin_per_user" IS 'total_coin_supply / wallet count; null if no wallets.';
COMMENT ON COLUMN "public"."economy_metrics_daily"."top_10_percent_ratio" IS 'Sum of coin_balance of top decile (by balance) / total_coin_supply; 0 if supply is 0.';

CREATE OR REPLACE FUNCTION "public"."snapshot_economy_metrics"()
RETURNS void
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_date date := (now() AT TIME ZONE 'UTC')::date;
  v_total_coin_supply bigint;
  v_total_vault_supply bigint;
  v_total_exp_supply bigint;
  v_total_coin_minted bigint;
  v_total_coin_burned bigint;
  v_total_exp_generated bigint;
  v_total_exp_converted bigint;
  v_active_users_count bigint;
  v_avg_coin_per_user numeric(18,4);
  v_top_10_percent_ratio numeric(5,4);
  v_wallet_count bigint;
BEGIN
  SELECT COALESCE(SUM(coin_balance), 0)::bigint INTO v_total_coin_supply FROM user_wallets;
  SELECT COALESCE(SUM(vault_coin_balance), 0)::bigint INTO v_total_vault_supply FROM user_wallets;
  SELECT COALESCE(SUM(total_exp_seconds), 0)::bigint INTO v_total_exp_supply FROM user_levels;
  SELECT COALESCE(SUM(amount), 0)::bigint INTO v_total_coin_minted FROM user_coin_transactions WHERE amount > 0;
  SELECT COALESCE(SUM(ABS(amount)), 0)::bigint INTO v_total_coin_burned FROM user_coin_transactions WHERE amount < 0;
  SELECT COALESCE(SUM(amount), 0)::bigint INTO v_total_exp_generated FROM user_exp_transactions WHERE amount > 0;
  SELECT COALESCE(SUM(ABS(amount)), 0)::bigint INTO v_total_exp_converted FROM user_exp_transactions WHERE amount < 0;
  SELECT COUNT(DISTINCT user_id)::bigint INTO v_active_users_count
    FROM user_coin_transactions
    WHERE created_at >= now() - interval '24 hours';
  SELECT COUNT(*)::bigint INTO v_wallet_count FROM user_wallets;
  IF v_wallet_count > 0 THEN
    v_avg_coin_per_user := (v_total_coin_supply::numeric / v_wallet_count);
    IF v_total_coin_supply > 0 THEN
      SELECT COALESCE(
        (SELECT SUM(coin_balance)::numeric
         FROM (
           SELECT coin_balance, NTILE(10) OVER (ORDER BY coin_balance DESC) AS decile
           FROM user_wallets
         ) t
         WHERE decile = 1),
        0
      ) / v_total_coin_supply INTO v_top_10_percent_ratio;
    ELSE
      v_top_10_percent_ratio := 0;
    END IF;
  ELSE
    v_avg_coin_per_user := NULL;
    v_top_10_percent_ratio := 0;
  END IF;

  INSERT INTO economy_metrics_daily (
    date, total_coin_supply, total_vault_supply, total_exp_supply,
    total_coin_minted, total_coin_burned,
    total_exp_generated, total_exp_converted, active_users_count,
    avg_coin_per_user, top_10_percent_ratio
  )
  VALUES (
    v_date, v_total_coin_supply, v_total_vault_supply, v_total_exp_supply,
    v_total_coin_minted, v_total_coin_burned,
    v_total_exp_generated, v_total_exp_converted, v_active_users_count,
    v_avg_coin_per_user, COALESCE(v_top_10_percent_ratio, 0)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_coin_supply = EXCLUDED.total_coin_supply,
    total_vault_supply = EXCLUDED.total_vault_supply,
    total_exp_supply = EXCLUDED.total_exp_supply,
    total_coin_minted = EXCLUDED.total_coin_minted,
    total_coin_burned = EXCLUDED.total_coin_burned,
    total_exp_generated = EXCLUDED.total_exp_generated,
    total_exp_converted = EXCLUDED.total_exp_converted,
    active_users_count = EXCLUDED.active_users_count,
    avg_coin_per_user = EXCLUDED.avg_coin_per_user,
    top_10_percent_ratio = EXCLUDED.top_10_percent_ratio;
END;
$$;

ALTER FUNCTION "public"."snapshot_economy_metrics"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."snapshot_economy_metrics"() IS 'Upserts daily economy aggregates for today UTC into economy_metrics_daily; includes supply, mint/burn, EXP generated/converted, active users, avg coin per user, top 10% ratio.';
