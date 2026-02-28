DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'economy_health_status') THEN
    CREATE TYPE "public"."economy_health_status" AS ENUM (
      'stable',
      'inflation_risk',
      'deflation_risk',
      'whale_dominance'
    );
  END IF;
END
$$;

ALTER TYPE "public"."economy_health_status" OWNER TO "postgres";

COMMENT ON TYPE "public"."economy_health_status" IS 'Daily economy health classification from stabilizer.';

CREATE TABLE IF NOT EXISTS "public"."economy_health_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL,
  "health_status" "public"."economy_health_status" NOT NULL,
  "metrics_snapshot" jsonb NOT NULL DEFAULT '{}',
  "actions_taken" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "economy_health_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "economy_health_reports_date_key" UNIQUE ("date")
);

ALTER TABLE "public"."economy_health_reports" OWNER TO "postgres";

COMMENT ON TABLE "public"."economy_health_reports" IS 'Daily economy health summary and stabilizer actions.';

CREATE INDEX IF NOT EXISTS "idx_economy_health_reports_date" ON "public"."economy_health_reports" ("date" DESC);

INSERT INTO "public"."economy_config" ("key", "value_json")
VALUES
  ('conversion_bonus_multiplier', to_jsonb(1.0)),
  ('milestone_reward_multiplier', to_jsonb(1.0)),
  ('cosmetic_price_multiplier', to_jsonb(1.0)),
  ('seasonal_decay_rate', to_jsonb(0.3)),
  ('stabilization_enabled', to_jsonb(true)),
  ('avg_coin_per_user_cap', to_jsonb(500))
ON CONFLICT ("key") DO NOTHING;

CREATE OR REPLACE FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint)
RETURNS TABLE(
  "exp_spent" bigint,
  "base_coins" integer,
  "bonus_coins" integer,
  "total_coins" integer,
  "new_coin_balance" integer
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_current_exp bigint;
  v_bonus_pct integer := 0;
  v_bonus_multiplier numeric(10,4) := 1.0;
  v_base integer;
  v_bonus integer;
  v_total integer;
  v_prev_balance integer;
  v_new_balance integer;
BEGIN
  IF p_exp_amount IS NULL OR p_exp_amount < 100 OR p_exp_amount % 100 != 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING errcode = 'check_violation';
  END IF;

  SELECT COALESCE((ec.value_json#>>'{}')::numeric, 1.0) INTO v_bonus_multiplier
  FROM economy_config ec WHERE ec.key = 'conversion_bonus_multiplier';

  SELECT total_exp_seconds INTO v_current_exp
  FROM user_levels
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_exp IS NULL OR v_current_exp < p_exp_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_EXP' USING errcode = 'check_violation';
  END IF;

  IF p_exp_amount >= 10000 THEN
    v_bonus_pct := 15;
  ELSIF p_exp_amount >= 5000 THEN
    v_bonus_pct := 10;
  ELSIF p_exp_amount >= 1000 THEN
    v_bonus_pct := 5;
  END IF;

  v_base := (p_exp_amount / 100)::integer;
  v_bonus := GREATEST(0, FLOOR(v_base * v_bonus_pct / 100.0 * v_bonus_multiplier)::integer);
  v_total := v_base + v_bonus;

  UPDATE user_levels
  SET total_exp_seconds = total_exp_seconds - p_exp_amount
  WHERE user_id = p_user_id;

  INSERT INTO user_exp_transactions (user_id, type, amount, metadata)
  VALUES (p_user_id, 'exp_conversion', -(p_exp_amount)::integer, jsonb_build_object('conversion_total_coins', v_total));

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
  VALUES (p_user_id, v_total, v_total, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + v_total,
    total_earned = user_wallets.total_earned + v_total;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (
    p_user_id,
    'exp_conversion',
    v_total,
    'exp_conversion',
    jsonb_build_object('exp_spent', p_exp_amount, 'base_coins', v_base, 'bonus_coins', v_bonus)
  );

  SELECT coin_balance INTO v_new_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  exp_spent := p_exp_amount;
  base_coins := v_base;
  bonus_coins := v_bonus;
  total_coins := v_total;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) IS 'Atomically deducts EXP, upserts wallet, writes both ledger entries. Bonus scaled by economy_config.conversion_bonus_multiplier.';

CREATE OR REPLACE FUNCTION "public"."increment_daily_exp_with_milestones"(
  "p_user_id" "uuid",
  "p_date" date,
  "p_exp_seconds" bigint
)
RETURNS TABLE(
  "exp_earned" bigint,
  "milestone_600_claimed" boolean,
  "milestone_1800_claimed" boolean,
  "milestone_3600_claimed" boolean
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_exp_boost_multiplier double precision := 1.0;
  v_daily_reward_multiplier double precision := 1.0;
  v_milestone_reward_multiplier numeric(10,4) := 1.0;
  v_effective_exp bigint;
  v_exp bigint;
  v_600 boolean;
  v_1800 boolean;
  v_3600 boolean;
  v_updated integer;
  v_reward_600 integer;
  v_reward_1800 integer;
  v_reward_3600 integer;
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(MAX(multiplier), 1.0) INTO v_exp_boost_multiplier
  FROM user_active_boosts
  WHERE user_id = p_user_id AND boost_type = 'exp_boost_30m' AND expires_at > now();

  SELECT COALESCE(MAX(multiplier), 1.0) INTO v_daily_reward_multiplier
  FROM user_active_boosts
  WHERE user_id = p_user_id AND boost_type = 'daily_reward_multiplier' AND expires_at > now();

  SELECT COALESCE((ec.value_json#>>'{}')::numeric, 1.0) INTO v_milestone_reward_multiplier
  FROM economy_config ec WHERE ec.key = 'milestone_reward_multiplier';

  v_reward_600 := (2 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_1800 := (6 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_3600 := (12 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;

  v_effective_exp := (p_exp_seconds * v_exp_boost_multiplier)::bigint;

  INSERT INTO user_exp_daily (user_id, date, exp_seconds, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed)
  VALUES (p_user_id, p_date, v_effective_exp, false, false, false)
  ON CONFLICT (user_id, date) DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + v_effective_exp,
    updated_at = now();

  INSERT INTO user_exp_transactions (user_id, type, amount, metadata)
  VALUES (p_user_id, 'call_duration', v_effective_exp::integer,
    jsonb_build_object('base_exp', p_exp_seconds, 'multiplier', v_exp_boost_multiplier, 'final_exp', v_effective_exp, 'local_date', p_date));

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_exp, v_600, v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id AND ud.date = p_date;

  IF v_exp >= 600 AND NOT v_600 THEN
    UPDATE user_exp_daily SET milestone_600_claimed = true
    WHERE user_id = p_user_id AND date = p_date AND NOT milestone_600_claimed AND exp_seconds >= 600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_600, v_reward_600, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_600,
        total_earned = user_wallets.total_earned + v_reward_600;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (p_user_id, 'daily_milestone', v_reward_600, 'daily_milestone_600', jsonb_build_object('local_date', p_date, 'threshold', 600));
    END IF;
  END IF;

  SELECT ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed INTO v_600, v_1800, v_3600
  FROM user_exp_daily ud WHERE ud.user_id = p_user_id AND ud.date = p_date;

  IF v_exp >= 1800 AND NOT v_1800 THEN
    UPDATE user_exp_daily SET milestone_1800_claimed = true
    WHERE user_id = p_user_id AND date = p_date AND NOT milestone_1800_claimed AND exp_seconds >= 1800;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_1800, v_reward_1800, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_1800,
        total_earned = user_wallets.total_earned + v_reward_1800;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (p_user_id, 'daily_milestone', v_reward_1800, 'daily_milestone_1800', jsonb_build_object('local_date', p_date, 'threshold', 1800));
    END IF;
  END IF;

  SELECT ud.milestone_1800_claimed, ud.milestone_3600_claimed INTO v_1800, v_3600
  FROM user_exp_daily ud WHERE ud.user_id = p_user_id AND ud.date = p_date;

  IF v_exp >= 3600 AND NOT v_3600 THEN
    UPDATE user_exp_daily SET milestone_3600_claimed = true
    WHERE user_id = p_user_id AND date = p_date AND NOT milestone_3600_claimed AND exp_seconds >= 3600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_3600, v_reward_3600, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_3600,
        total_earned = user_wallets.total_earned + v_reward_3600;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (p_user_id, 'daily_milestone', v_reward_3600, 'daily_milestone_3600', jsonb_build_object('local_date', p_date, 'threshold', 3600));
    END IF;
  END IF;

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO exp_earned, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id AND ud.date = p_date;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) IS 'Increments daily EXP (with exp_boost multiplier), grants milestone coins (with milestone_reward_multiplier and daily_reward_multiplier), writes exp_transaction.';

CREATE OR REPLACE FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid")
RETURNS TABLE("new_coin_balance" integer)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_item record;
  v_balance integer;
  v_new_balance integer;
  v_price_multiplier numeric(10,4) := 1.0;
  v_effective_price integer;
BEGIN
  SELECT COALESCE((ec.value_json#>>'{}')::numeric, 1.0) INTO v_price_multiplier
  FROM economy_config ec WHERE ec.key = 'cosmetic_price_multiplier';

  SELECT id, price, is_active INTO v_item
  FROM coin_shop_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND' USING errcode = 'check_violation';
  END IF;
  IF NOT v_item.is_active THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND' USING errcode = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM user_owned_items WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'ALREADY_OWNED' USING errcode = 'check_violation';
  END IF;

  v_effective_price := GREATEST(1, ceil(v_item.price * v_price_multiplier)::integer);

  SELECT coin_balance INTO v_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS' USING errcode = 'check_violation';
  END IF;
  IF v_balance < v_effective_price THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS' USING errcode = 'check_violation';
  END IF;

  UPDATE user_wallets
  SET coin_balance = coin_balance - v_effective_price,
      total_spent = total_spent + v_effective_price
  WHERE user_id = p_user_id;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (p_user_id, 'shop_purchase', -(v_effective_price), 'shop_purchase',
    jsonb_build_object('item_id', p_item_id, 'base_price', v_item.price, 'effective_price', v_effective_price));

  INSERT INTO user_owned_items (user_id, item_id)
  VALUES (p_user_id, p_item_id);

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") IS 'Atomically deducts coins (price scaled by economy_config.cosmetic_price_multiplier), logs ledger, grants item.';

CREATE OR REPLACE FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid")
RETURNS void
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_decay_threshold integer;
  v_decay_rate numeric(5,4);
  v_config_decay_rate numeric(5,4);
  v_coin_balance integer;
  v_excess integer;
  v_decay_amount integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_season_records
    WHERE user_id = p_user_id AND season_id = p_season_id AND decay_processed = true
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM seasons WHERE id = p_season_id AND end_at <= now()
  ) THEN
    RAISE EXCEPTION 'SEASON_NOT_EXPIRED' USING errcode = 'check_violation';
  END IF;

  SELECT decay_threshold, decay_rate INTO v_decay_threshold, v_decay_rate
  FROM seasons WHERE id = p_season_id;

  SELECT (ec.value_json#>>'{}')::numeric(5,4) INTO v_config_decay_rate
  FROM economy_config ec WHERE ec.key = 'seasonal_decay_rate';
  v_decay_rate := COALESCE(v_config_decay_rate, v_decay_rate);

  SELECT coin_balance INTO v_coin_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_coin_balance IS NULL THEN
    INSERT INTO user_season_records (user_id, season_id, decay_processed)
    VALUES (p_user_id, p_season_id, true)
    ON CONFLICT (user_id, season_id) DO UPDATE SET decay_processed = true;
    RETURN;
  END IF;

  v_excess := GREATEST(v_coin_balance - v_decay_threshold, 0);

  IF v_excess > 0 THEN
    v_decay_amount := FLOOR(v_excess * v_decay_rate)::integer;

    IF v_decay_amount > 0 THEN
      UPDATE user_wallets
      SET coin_balance = coin_balance - v_decay_amount,
          vault_coin_balance = vault_coin_balance + v_decay_amount
      WHERE user_id = p_user_id;

      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'seasonal_decay',
        -v_decay_amount,
        'seasonal_decay',
        jsonb_build_object('season_id', p_season_id, 'threshold', v_decay_threshold, 'rate', v_decay_rate)
      );

      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'vault_deposit',
        v_decay_amount,
        'seasonal_decay',
        jsonb_build_object('season_id', p_season_id)
      );
    END IF;
  END IF;

  INSERT INTO user_season_records (user_id, season_id, decay_processed)
  VALUES (p_user_id, p_season_id, true)
  ON CONFLICT (user_id, season_id) DO UPDATE SET decay_processed = true;
END;
$$;

ALTER FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") IS 'Applies soft decay for one user for an expired season. Uses economy_config.seasonal_decay_rate when set, else season.decay_rate.';

GRANT ALL ON TABLE "public"."economy_health_reports" TO "anon";
GRANT ALL ON TABLE "public"."economy_health_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."economy_health_reports" TO "service_role";
