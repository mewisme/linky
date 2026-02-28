ALTER TABLE "public"."user_details"
  ADD COLUMN IF NOT EXISTS "timezone" text;

COMMENT ON COLUMN "public"."user_details"."timezone" IS 'IANA timezone; set once for reward date gating, then locked.';

CREATE OR REPLACE FUNCTION "public"."fn_user_details_timezone_immutable"()
RETURNS trigger
LANGUAGE "plpgsql"
AS $$
BEGIN
  IF OLD.timezone IS NOT NULL AND (NEW.timezone IS DISTINCT FROM OLD.timezone) THEN
    RAISE EXCEPTION 'TIMEZONE_LOCKED' USING errcode = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."fn_user_details_timezone_immutable"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "trigger_user_details_timezone_immutable" ON "public"."user_details";
CREATE TRIGGER "trigger_user_details_timezone_immutable"
  BEFORE UPDATE ON "public"."user_details"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_user_details_timezone_immutable"();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_total_exp_seconds' AND conrelid = 'public.user_levels'::regclass) THEN
    ALTER TABLE "public"."user_levels" ADD CONSTRAINT "check_total_exp_seconds" CHECK (total_exp_seconds >= 0);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION "public"."grant_user_exp"(
  "p_user_id" "uuid",
  "p_exp_seconds" bigint,
  "p_date" date,
  "p_reason" text
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
  v_divisor bigint := 2000;
  v_points integer;
  v_rank "public"."prestige_rank";
  v_tier integer;
  v_config jsonb;
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(MAX(multiplier), 1.0) INTO v_exp_boost_multiplier
  FROM user_active_boosts
  WHERE user_id = p_user_id AND boost_type = 'exp_boost_30m' AND expires_at > now();

  v_effective_exp := (p_exp_seconds * v_exp_boost_multiplier)::bigint;

  INSERT INTO user_levels (user_id, total_exp_seconds)
  VALUES (p_user_id, v_effective_exp)
  ON CONFLICT (user_id)
  DO UPDATE SET total_exp_seconds = GREATEST(0, user_levels.total_exp_seconds + v_effective_exp);

  UPDATE users
  SET lifetime_exp = lifetime_exp + v_effective_exp
  WHERE id = p_user_id;

  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_divisor';
  IF v_config IS NOT NULL THEN
    v_divisor := (v_config#>>'{}')::bigint;
  END IF;
  IF v_divisor IS NULL OR v_divisor <= 0 THEN
    v_divisor := 2000;
  END IF;
  SELECT floor((SELECT lifetime_exp FROM users WHERE id = p_user_id) / v_divisor)::integer INTO v_points;
  SELECT f.rank, f.tier INTO v_rank, v_tier FROM fn_prestige_rank_tier(v_points) f;
  UPDATE users
  SET prestige_points = v_points, prestige_rank = v_rank, prestige_tier = v_tier
  WHERE id = p_user_id;

  INSERT INTO user_exp_transactions (user_id, type, amount, metadata)
  VALUES (p_user_id, COALESCE(p_reason, 'call_duration'), v_effective_exp::integer,
    jsonb_build_object('base_exp', p_exp_seconds, 'multiplier', v_exp_boost_multiplier, 'final_exp', v_effective_exp, 'local_date', p_date));

  SELECT COALESCE(MAX(multiplier), 1.0) INTO v_daily_reward_multiplier
  FROM user_active_boosts
  WHERE user_id = p_user_id AND boost_type = 'daily_reward_multiplier' AND expires_at > now();
  SELECT COALESCE((ec.value_json#>>'{}')::numeric, 1.0) INTO v_milestone_reward_multiplier
  FROM economy_config ec WHERE ec.key = 'milestone_reward_multiplier';
  v_reward_600 := (2 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_1800 := (6 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_3600 := (12 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;

  INSERT INTO user_exp_daily (user_id, date, exp_seconds, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed)
  VALUES (p_user_id, p_date, v_effective_exp, false, false, false)
  ON CONFLICT (user_id, date) DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + v_effective_exp,
    updated_at = now();

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_exp, v_600, v_1800, v_3600
  FROM user_exp_daily ud WHERE ud.user_id = p_user_id AND ud.date = p_date;

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
  FROM user_exp_daily ud WHERE ud.user_id = p_user_id AND ud.date = p_date;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" date, "p_reason" text) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" date, "p_reason" text) IS 'Canonical EXP grant: user_levels, users.lifetime_exp, prestige, user_exp_daily, milestones, user_exp_transactions.';

CREATE OR REPLACE FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint)
RETURNS void
LANGUAGE "plpgsql"
AS $$
BEGIN
  IF p_seconds IS NULL OR p_seconds <= 0 THEN RETURN; END IF;
  PERFORM * FROM grant_user_exp(p_user_id, p_seconds, (now() AT TIME ZONE 'UTC')::date, 'call_duration');
END;
$$;

ALTER FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) OWNER TO "postgres";

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
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM grant_user_exp(p_user_id, p_exp_seconds, p_date, 'call_duration');
END;
$$;

ALTER FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid")
RETURNS TABLE(
  "streak_day" integer,
  "reward" integer,
  "new_coin_balance" integer
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_tz text;
  v_local_date date;
  v_last date;
  v_streak integer;
  v_weeks integer;
  v_new_streak integer;
  v_reward integer;
  v_new_balance integer;
BEGIN
  SELECT COALESCE(ud.timezone, 'UTC') INTO v_tz FROM user_details ud WHERE ud.user_id = p_user_id;
  IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;
  v_local_date := (now() AT TIME ZONE v_tz)::date;

  INSERT INTO user_weekly_checkins (user_id, streak_day, last_checkin_local_date, total_weeks_completed)
  VALUES (p_user_id, 0, NULL, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_checkin_local_date, uwc.streak_day, total_weeks_completed
  INTO v_last, v_streak, v_weeks
  FROM user_weekly_checkins uwc
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_last = v_local_date THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED' USING errcode = 'check_violation';
  END IF;

  IF v_last = v_local_date - 1 THEN
    IF v_streak = 7 THEN v_new_streak := 1; ELSE v_new_streak := v_streak + 1; END IF;
  ELSE
    v_new_streak := 1;
  END IF;

  v_reward := CASE v_new_streak
    WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 5 WHEN 5 THEN 6 WHEN 6 THEN 8 WHEN 7 THEN 18
    ELSE 2 END;

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
  VALUES (p_user_id, v_reward, v_reward, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + v_reward,
    total_earned = user_wallets.total_earned + v_reward;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (p_user_id, 'weekly_checkin', v_reward, 'weekly_checkin',
    jsonb_build_object('streak_day', v_new_streak, 'local_date', v_local_date));

  IF v_new_streak = 7 THEN
    UPDATE user_weekly_checkins
    SET streak_day = v_new_streak, last_checkin_local_date = v_local_date, total_weeks_completed = total_weeks_completed + 1
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_weekly_checkins
    SET streak_day = v_new_streak, last_checkin_local_date = v_local_date
    WHERE user_id = p_user_id;
  END IF;

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;
  streak_day := v_new_streak;
  reward := v_reward;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid") IS 'Claims weekly check-in for user local date from user_details.timezone (UTC fallback).';

CREATE OR REPLACE FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer)
RETURNS TABLE("reward" integer, "new_coin_balance" integer)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_tz text;
  v_local_date date;
  v_year integer;
  v_month integer;
  v_today_day integer;
  v_days_in_month integer;
  v_claimed integer[];
  v_reward integer;
  v_new_balance integer;
BEGIN
  SELECT COALESCE(ud.timezone, 'UTC') INTO v_tz FROM user_details ud WHERE ud.user_id = p_user_id;
  IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;
  v_local_date := (now() AT TIME ZONE v_tz)::date;
  v_year := EXTRACT(YEAR FROM v_local_date)::integer;
  v_month := EXTRACT(MONTH FROM v_local_date)::integer;
  v_today_day := EXTRACT(DAY FROM v_local_date)::integer;

  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'))::integer;

  IF p_day < 1 OR p_day > v_days_in_month THEN
    RAISE EXCEPTION 'INVALID_DAY' USING errcode = 'check_violation';
  END IF;
  IF p_day > v_today_day THEN
    RAISE EXCEPTION 'FUTURE_DAY' USING errcode = 'check_violation';
  END IF;

  INSERT INTO user_monthly_checkins (user_id, year, month, claimed_days, buyback_count)
  VALUES (p_user_id, v_year, v_month, '{}', 0)
  ON CONFLICT (user_id, year, month) DO NOTHING;

  SELECT claimed_days INTO v_claimed
  FROM user_monthly_checkins
  WHERE user_id = p_user_id AND year = v_year AND month = v_month
  FOR UPDATE;

  IF v_claimed IS NULL THEN
    SELECT claimed_days INTO v_claimed FROM user_monthly_checkins
    WHERE user_id = p_user_id AND year = v_year AND month = v_month FOR UPDATE;
  END IF;

  IF p_day = ANY(v_claimed) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED' USING errcode = 'check_violation';
  END IF;

  v_reward := monthly_reward_for_day(p_day, v_days_in_month);

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
  VALUES (p_user_id, v_reward, v_reward, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + v_reward,
    total_earned = user_wallets.total_earned + v_reward;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (p_user_id, 'monthly_checkin', v_reward, 'monthly_checkin',
    jsonb_build_object('year', v_year, 'month', v_month, 'day', p_day));

  UPDATE user_monthly_checkins
  SET claimed_days = array_append(claimed_days, p_day)
  WHERE user_id = p_user_id AND year = v_year AND month = v_month;

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;
  reward := v_reward;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer) IS 'Claims monthly check-in for day; year/month/today from user_details.timezone.';

CREATE OR REPLACE FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer)
RETURNS TABLE("exp_spent" integer, "reward" integer, "new_coin_balance" integer)
LANGUAGE "plpgsql"
AS $$
DECLARE
  v_tz text;
  v_local_date date;
  v_year integer;
  v_month integer;
  v_today_day integer;
  v_days_in_month integer;
  v_claimed integer[];
  v_buyback_count integer;
  v_cost integer;
  v_reward integer;
  v_current_exp bigint;
  v_new_balance integer;
BEGIN
  SELECT COALESCE(ud.timezone, 'UTC') INTO v_tz FROM user_details ud WHERE ud.user_id = p_user_id;
  IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;
  v_local_date := (now() AT TIME ZONE v_tz)::date;
  v_year := EXTRACT(YEAR FROM v_local_date)::integer;
  v_month := EXTRACT(MONTH FROM v_local_date)::integer;
  v_today_day := EXTRACT(DAY FROM v_local_date)::integer;

  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day'))::integer;

  IF p_day < 1 OR p_day > v_days_in_month THEN
    RAISE EXCEPTION 'INVALID_DAY' USING errcode = 'check_violation';
  END IF;
  IF p_day >= v_today_day THEN
    RAISE EXCEPTION 'BUYBACK_FUTURE_OR_TODAY' USING errcode = 'check_violation';
  END IF;

  INSERT INTO user_monthly_checkins (user_id, year, month, claimed_days, buyback_count)
  VALUES (p_user_id, v_year, v_month, '{}', 0)
  ON CONFLICT (user_id, year, month) DO NOTHING;

  SELECT ul.total_exp_seconds INTO v_current_exp FROM user_levels ul WHERE ul.user_id = p_user_id FOR UPDATE;
  IF v_current_exp IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_EXP' USING errcode = 'check_violation';
  END IF;

  SELECT umc.claimed_days, umc.buyback_count INTO v_claimed, v_buyback_count
  FROM user_monthly_checkins umc
  WHERE umc.user_id = p_user_id AND umc.year = v_year AND umc.month = v_month
  FOR UPDATE;

  IF v_claimed IS NULL THEN
    RAISE EXCEPTION 'NO_MONTHLY_RECORD' USING errcode = 'check_violation';
  END IF;

  IF p_day = ANY(v_claimed) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED' USING errcode = 'check_violation';
  END IF;

  v_cost := buyback_cost_for_index(v_buyback_count);
  IF v_current_exp < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_EXP' USING errcode = 'check_violation';
  END IF;

  v_reward := monthly_reward_for_day(p_day, v_days_in_month);

  UPDATE user_levels SET total_exp_seconds = total_exp_seconds - v_cost WHERE user_id = p_user_id;

  INSERT INTO user_exp_transactions (user_id, type, amount, metadata)
  VALUES (p_user_id, 'monthly_buyback', -v_cost, jsonb_build_object('year', v_year, 'month', v_month, 'day', p_day));

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
  VALUES (p_user_id, v_reward, v_reward, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + v_reward,
    total_earned = user_wallets.total_earned + v_reward;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (p_user_id, 'monthly_checkin', v_reward, 'monthly_buyback',
    jsonb_build_object('year', v_year, 'month', v_month, 'day', p_day, 'exp_spent', v_cost));

  UPDATE user_monthly_checkins
  SET claimed_days = array_append(claimed_days, p_day),
      buyback_count = buyback_count + 1
  WHERE user_id = p_user_id AND year = v_year AND month = v_month;

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;
  exp_spent := v_cost;
  reward := v_reward;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer) IS 'Buyback missed day; year/month/today from user_details.timezone.';

ALTER TABLE "public"."economy_config" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."economy_config" FROM "anon";
REVOKE ALL ON TABLE "public"."economy_config" FROM "authenticated";
GRANT ALL ON TABLE "public"."economy_config" TO "service_role";

REVOKE ALL ON TABLE "public"."user_wallets" FROM "anon";
REVOKE ALL ON TABLE "public"."user_wallets" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_wallets" TO "service_role";

REVOKE ALL ON TABLE "public"."user_coin_transactions" FROM "anon";
REVOKE ALL ON TABLE "public"."user_coin_transactions" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_coin_transactions" TO "service_role";

REVOKE ALL ON TABLE "public"."user_exp_transactions" FROM "anon";
REVOKE ALL ON TABLE "public"."user_exp_transactions" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_exp_transactions" TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" date, "p_reason" text) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" date, "p_reason" text) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" date, "p_reason" text) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid") FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid") FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid") TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" date, "p_exp_seconds" bigint) TO "service_role";

REVOKE ALL ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) FROM "anon";
REVOKE ALL ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) FROM "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") FROM "authenticated";
GRANT ALL ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_user_wallets_updated_at"() FROM "anon";
REVOKE ALL ON FUNCTION "public"."update_user_wallets_updated_at"() FROM "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_wallets_updated_at"() TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."get_economy_stats"() FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."get_economy_stats"() FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_economy_stats"() TO "service_role";

REVOKE EXECUTE ON FUNCTION "public"."snapshot_economy_metrics"() FROM "anon";
REVOKE EXECUTE ON FUNCTION "public"."snapshot_economy_metrics"() FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."snapshot_economy_metrics"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_user_weekly_checkins_updated_at"() FROM "anon";
REVOKE ALL ON FUNCTION "public"."update_user_weekly_checkins_updated_at"() FROM "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_weekly_checkins_updated_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_user_monthly_checkins_updated_at"() FROM "anon";
REVOKE ALL ON FUNCTION "public"."update_user_monthly_checkins_updated_at"() FROM "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_monthly_checkins_updated_at"() TO "service_role";

REVOKE ALL ON TABLE "public"."user_weekly_checkins" FROM "anon";
REVOKE ALL ON TABLE "public"."user_weekly_checkins" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_weekly_checkins" TO "service_role";

REVOKE ALL ON TABLE "public"."user_monthly_checkins" FROM "anon";
REVOKE ALL ON TABLE "public"."user_monthly_checkins" FROM "authenticated";
GRANT ALL ON TABLE "public"."user_monthly_checkins" TO "service_role";