CREATE TABLE IF NOT EXISTS "public"."user_active_boosts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "boost_type" text NOT NULL,
    "multiplier" double precision NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_active_boosts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."user_active_boosts" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_active_boosts" IS 'Time-limited boosts. boost_type: exp_boost_30m | daily_reward_multiplier';

CREATE INDEX IF NOT EXISTS "idx_user_active_boosts_user_expires" ON "public"."user_active_boosts" ("user_id", "expires_at");

ALTER TABLE ONLY "public"."user_active_boosts"
    ADD CONSTRAINT "fk_user_active_boosts_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text)
RETURNS TABLE("expires_at" timestamp with time zone, "new_coin_balance" integer)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_cost integer;
  v_duration_seconds integer;
  v_multiplier double precision;
  v_balance integer;
  v_expires timestamptz;
  v_new_balance integer;
BEGIN
  v_cost := CASE p_boost_type
    WHEN 'exp_boost_30m' THEN 120
    WHEN 'daily_reward_multiplier' THEN 80
    ELSE NULL
  END;

  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'INVALID_BOOST_TYPE' USING errcode = 'check_violation';
  END IF;

  v_duration_seconds := CASE p_boost_type
    WHEN 'exp_boost_30m' THEN 30 * 60
    WHEN 'daily_reward_multiplier' THEN 24 * 60 * 60
    ELSE 0
  END;
  v_multiplier := CASE p_boost_type
    WHEN 'exp_boost_30m' THEN 1.2
    WHEN 'daily_reward_multiplier' THEN 2.0
    ELSE 1.0
  END;

  SELECT coin_balance INTO v_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS' USING errcode = 'check_violation';
  END IF;
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS' USING errcode = 'check_violation';
  END IF;

  v_expires := now() + (v_duration_seconds || ' seconds')::interval;

  UPDATE user_wallets
  SET coin_balance = coin_balance - v_cost,
      total_spent = total_spent + v_cost
  WHERE user_id = p_user_id;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (p_user_id, 'boost_purchase', -v_cost, 'boost_purchase',
    jsonb_build_object('boost_type', p_boost_type, 'expires_at', v_expires));

  INSERT INTO user_active_boosts (user_id, boost_type, multiplier, expires_at)
  VALUES (p_user_id, p_boost_type, v_multiplier, v_expires);

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;

  expires_at := v_expires;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) IS 'Deducts coins and creates time-limited boost. Raises INVALID_BOOST_TYPE, INSUFFICIENT_COINS.';

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
  v_effective_exp bigint;
  v_exp bigint;
  v_600 boolean;
  v_1800 boolean;
  v_3600 boolean;
  v_updated integer;
  v_reward_600 integer := 2;
  v_reward_1800 integer := 6;
  v_reward_3600 integer := 12;
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

  v_effective_exp := (p_exp_seconds * v_exp_boost_multiplier)::bigint;

  INSERT INTO user_exp_daily (user_id, date, exp_seconds, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed)
  VALUES (p_user_id, p_date, v_effective_exp, false, false, false)
  ON CONFLICT (user_id, date) DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + v_effective_exp,
    updated_at = now();

  INSERT INTO user_exp_transactions (user_id, type, amount, metadata)
  VALUES (p_user_id, 'call_duration', v_effective_exp::integer,
    jsonb_build_object('base_exp', p_exp_seconds, 'multiplier', v_exp_boost_multiplier, 'final_exp', v_effective_exp, 'local_date', p_date));

  v_reward_600 := (2 * v_daily_reward_multiplier)::integer;
  v_reward_1800 := (6 * v_daily_reward_multiplier)::integer;
  v_reward_3600 := (12 * v_daily_reward_multiplier)::integer;

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

COMMENT ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) IS 'Increments daily EXP (with exp_boost multiplier), grants milestone coins (with daily_reward_multiplier), writes exp_transaction with base_exp/multiplier/final_exp.';

GRANT ALL ON TABLE "public"."user_active_boosts" TO "anon";
GRANT ALL ON TABLE "public"."user_active_boosts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_boosts" TO "service_role";

GRANT ALL ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) TO "anon";
GRANT ALL ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) TO "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) TO "service_role";

GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "service_role";

