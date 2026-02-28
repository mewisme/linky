


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."economy_health_status" AS ENUM (
    'stable',
    'inflation_risk',
    'deflation_risk',
    'whale_dominance'
);


ALTER TYPE "public"."economy_health_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."economy_health_status" IS 'Daily economy health classification from stabilizer.';



CREATE TYPE "public"."prestige_rank" AS ENUM (
    'plastic',
    'bronze',
    'silver',
    'gold',
    'platinum',
    'diamond',
    'immortal',
    'ascendant',
    'eternal',
    'mythic',
    'celestial',
    'transcendent'
);


ALTER TYPE "public"."prestige_rank" OWNER TO "postgres";


COMMENT ON TYPE "public"."prestige_rank" IS 'Prestige rank names; each rank has tiers I-III except transcendent.';



CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'member',
    'superadmin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") RETURNS "void"
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



CREATE OR REPLACE FUNCTION "public"."buyback_cost_for_index"("p_index" integer) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN LEAST(300 + (p_index * 100), 800);
END;
$$;


ALTER FUNCTION "public"."buyback_cost_for_index"("p_index" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) IS 'Monthly buyback EXP cost: 300 + (index * 100), capped at 800';



CREATE OR REPLACE FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer) RETURNS TABLE("exp_spent" integer, "reward" integer, "new_coin_balance" integer)
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



CREATE OR REPLACE FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) RETURNS TABLE("exp_spent" integer, "reward" integer, "new_coin_balance" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_days_in_month integer;
  v_claimed integer[];
  v_buyback_count integer;
  v_cost integer;
  v_reward integer;
  v_current_exp bigint;
  v_new_balance integer;
BEGIN
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day'))::integer;

  IF p_day < 1 OR p_day > v_days_in_month THEN
    RAISE EXCEPTION 'INVALID_DAY' USING errcode = 'check_violation';
  END IF;
  IF p_day >= p_today_day THEN
    RAISE EXCEPTION 'BUYBACK_FUTURE_OR_TODAY' USING errcode = 'check_violation';
  END IF;

  INSERT INTO user_monthly_checkins (user_id, year, month, claimed_days, buyback_count)
  VALUES (p_user_id, p_year, p_month, '{}', 0)
  ON CONFLICT (user_id, year, month) DO NOTHING;

  SELECT ul.total_exp_seconds INTO v_current_exp FROM user_levels ul WHERE ul.user_id = p_user_id FOR UPDATE;
  IF v_current_exp IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_EXP' USING errcode = 'check_violation';
  END IF;

  SELECT umc.claimed_days, umc.buyback_count INTO v_claimed, v_buyback_count
  FROM user_monthly_checkins umc
  WHERE umc.user_id = p_user_id AND umc.year = p_year AND umc.month = p_month
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
  VALUES (p_user_id, 'monthly_buyback', -v_cost, jsonb_build_object('year', p_year, 'month', p_month, 'day', p_day));

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
  VALUES (p_user_id, v_reward, v_reward, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + v_reward,
    total_earned = user_wallets.total_earned + v_reward;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (p_user_id, 'monthly_checkin', v_reward, 'monthly_buyback',
    jsonb_build_object('year', p_year, 'month', p_month, 'day', p_day, 'exp_spent', v_cost));

  UPDATE user_monthly_checkins
  SET claimed_days = array_append(claimed_days, p_day),
      buyback_count = buyback_count + 1
  WHERE user_id = p_user_id AND year = p_year AND month = p_month;

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;
  exp_spent := v_cost;
  reward := v_reward;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) IS 'Buyback a missed day with EXP. Progressive cost.';



CREATE OR REPLACE FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer) RETURNS TABLE("reward" integer, "new_coin_balance" integer)
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



CREATE OR REPLACE FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) RETURNS TABLE("reward" integer, "new_coin_balance" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_days_in_month integer;
  v_claimed integer[];
  v_reward integer;
  v_new_balance integer;
BEGIN
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day'))::integer;

  IF p_day < 1 OR p_day > v_days_in_month THEN
    RAISE EXCEPTION 'INVALID_DAY' USING errcode = 'check_violation';
  END IF;
  IF p_day > p_today_day THEN
    RAISE EXCEPTION 'FUTURE_DAY' USING errcode = 'check_violation';
  END IF;

  INSERT INTO user_monthly_checkins (user_id, year, month, claimed_days, buyback_count)
  VALUES (p_user_id, p_year, p_month, '{}', 0)
  ON CONFLICT (user_id, year, month) DO NOTHING;

  SELECT claimed_days INTO v_claimed
  FROM user_monthly_checkins
  WHERE user_id = p_user_id AND year = p_year AND month = p_month
  FOR UPDATE;

  IF v_claimed IS NULL THEN
    SELECT claimed_days INTO v_claimed FROM user_monthly_checkins
    WHERE user_id = p_user_id AND year = p_year AND month = p_month FOR UPDATE;
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
    jsonb_build_object('year', p_year, 'month', p_month, 'day', p_day));

  UPDATE user_monthly_checkins
  SET claimed_days = array_append(claimed_days, p_day)
  WHERE user_id = p_user_id AND year = p_year AND month = p_month;

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;
  reward := v_reward;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) IS 'Claims monthly check-in for a day. Day must be in month and not future.';



CREATE OR REPLACE FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid") RETURNS TABLE("streak_day" integer, "reward" integer, "new_coin_balance" integer)
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



CREATE OR REPLACE FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" "date") RETURNS TABLE("streak_day" integer, "reward" integer, "new_coin_balance" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_last date;
  v_streak integer;
  v_weeks integer;
  v_new_streak integer;
  v_reward integer;
  v_new_balance integer;
BEGIN
  INSERT INTO user_weekly_checkins (user_id, streak_day, last_checkin_local_date, total_weeks_completed)
  VALUES (p_user_id, 0, NULL, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_checkin_local_date, uwc.streak_day, total_weeks_completed
  INTO v_last, v_streak, v_weeks
  FROM user_weekly_checkins uwc
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_last = p_local_date THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED' USING errcode = 'check_violation';
  END IF;

  IF v_last = p_local_date - 1 THEN
    IF v_streak = 7 THEN
      v_new_streak := 1;
    ELSE
      v_new_streak := v_streak + 1;
    END IF;
  ELSE
    v_new_streak := 1;
  END IF;

  v_reward := CASE v_new_streak
    WHEN 1 THEN 2
    WHEN 2 THEN 3
    WHEN 3 THEN 4
    WHEN 4 THEN 5
    WHEN 5 THEN 6
    WHEN 6 THEN 8
    WHEN 7 THEN 18
    ELSE 2
  END;

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
  VALUES (p_user_id, v_reward, v_reward, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + v_reward,
    total_earned = user_wallets.total_earned + v_reward;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (
    p_user_id,
    'weekly_checkin',
    v_reward,
    'weekly_checkin',
    jsonb_build_object('streak_day', v_new_streak, 'local_date', p_local_date)
  );

  IF v_new_streak = 7 THEN
    UPDATE user_weekly_checkins
    SET streak_day = v_new_streak,
        last_checkin_local_date = p_local_date,
        total_weeks_completed = total_weeks_completed + 1
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_weekly_checkins
    SET streak_day = v_new_streak,
        last_checkin_local_date = p_local_date
    WHERE user_id = p_user_id;
  END IF;

  SELECT coin_balance INTO v_new_balance FROM user_wallets WHERE user_id = p_user_id;

  streak_day := v_new_streak;
  reward := v_reward;
  new_coin_balance := v_new_balance;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" "date") IS 'Claims weekly check-in for local date. Idempotent per day; resets if gap > 1 day.';



CREATE OR REPLACE FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) RETURNS TABLE("exp_spent" bigint, "base_coins" integer, "bonus_coins" integer, "total_coins" integer, "new_coin_balance" integer)
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



CREATE OR REPLACE FUNCTION "public"."create_user_details_on_user_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert a new user_details record with the new user's ID
  INSERT INTO user_details (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_details already exists
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_details_on_user_insert"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_user_details_on_user_insert"() IS 'Automatically creates a user_details record when a new user is inserted into the users table';



CREATE OR REPLACE FUNCTION "public"."create_user_embedding_on_user_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_embeddings (user_id, embedding, model_name, source_hash)
  VALUES (NEW.id, NULL, NULL, '')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_embedding_on_user_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer DEFAULT 10, "p_threshold" double precision DEFAULT NULL::double precision, "p_exclude_user_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("user_id" "uuid", "similarity_score" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  WITH "base" AS (
    SELECT "embedding"
    FROM "public"."user_embeddings"
    WHERE "user_id" = "p_user_id"
      AND "embedding" IS NOT NULL
    LIMIT 1
  )
  SELECT
    "ue"."user_id",
    (1 - ("ue"."embedding" <=> "b"."embedding"))::double precision AS "similarity_score"
  FROM "public"."user_embeddings" "ue"
  CROSS JOIN "base" "b"
  WHERE "ue"."user_id" != "p_user_id"
    AND "ue"."embedding" IS NOT NULL
    AND ("p_threshold" IS NULL OR (1 - ("ue"."embedding" <=> "b"."embedding")) >= "p_threshold")
    AND ("p_exclude_user_ids" IS NULL OR "ue"."user_id" != ALL("p_exclude_user_ids"))
  ORDER BY "ue"."embedding" <=> "b"."embedding"
  LIMIT "p_limit";
$$;


ALTER FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer, "p_threshold" double precision, "p_exclude_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v_level integer := 1;
  v_exp_required bigint := 0;
  v_base integer := 300;
  v_step integer := 120;
BEGIN
  IF p_total_exp_seconds IS NULL OR p_total_exp_seconds <= 0 THEN
    RETURN 1;
  END IF;
  WHILE v_exp_required + v_base + (v_level - 1) * v_step <= p_total_exp_seconds LOOP
    v_exp_required := v_exp_required + v_base + (v_level - 1) * v_step;
    v_level := v_level + 1;
  END LOOP;
  RETURN v_level;
END;
$$;


ALTER FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) IS 'Level from total_exp_seconds using base=300, step=120 (matches app level-from-exp).';



CREATE OR REPLACE FUNCTION "public"."fn_init_user_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert a new user_settings record with the new user's ID
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_settings already exists

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_init_user_settings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_init_user_settings"() IS 'Initialize user_settings when a new user is inserted';



CREATE OR REPLACE FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer) RETURNS TABLE("rank" "public"."prestige_rank", "tier" integer)
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v_rank_idx integer;
  v_tier integer;
  v_points integer := COALESCE(p_prestige_points, 0);
BEGIN
  IF v_points >= 3600 THEN
    rank := 'transcendent'::"public"."prestige_rank";
    tier := NULL;
    RETURN NEXT;
    RETURN;
  END IF;
  v_rank_idx := LEAST(11, v_points / 300);
  v_tier := (v_points % 300) / 100 + 1;
  IF v_tier < 1 THEN v_tier := 1; END IF;
  IF v_tier > 3 THEN v_tier := 3; END IF;
  rank := CASE v_rank_idx
    WHEN 0 THEN 'plastic'::"public"."prestige_rank"
    WHEN 1 THEN 'bronze'::"public"."prestige_rank"
    WHEN 2 THEN 'silver'::"public"."prestige_rank"
    WHEN 3 THEN 'gold'::"public"."prestige_rank"
    WHEN 4 THEN 'platinum'::"public"."prestige_rank"
    WHEN 5 THEN 'diamond'::"public"."prestige_rank"
    WHEN 6 THEN 'immortal'::"public"."prestige_rank"
    WHEN 7 THEN 'ascendant'::"public"."prestige_rank"
    WHEN 8 THEN 'eternal'::"public"."prestige_rank"
    WHEN 9 THEN 'mythic'::"public"."prestige_rank"
    WHEN 10 THEN 'celestial'::"public"."prestige_rank"
    ELSE 'transcendent'::"public"."prestige_rank"
  END;
  tier := v_tier;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer) IS 'Derives prestige_rank and tier (1-3 or null) from prestige_points.';



CREATE OR REPLACE FUNCTION "public"."fn_user_details_timezone_immutable"() RETURNS "trigger"
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


CREATE OR REPLACE FUNCTION "public"."get_economy_stats"() RETURNS TABLE("total_coin_supply" bigint, "total_coins_minted" bigint, "total_exp_burned" bigint, "daily_mint_rate" bigint, "daily_burn_rate" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  total_coin_supply := (SELECT COALESCE(SUM(coin_balance), 0)::bigint FROM user_wallets);

  total_coins_minted := (
    SELECT COALESCE(SUM(amount), 0)::bigint
    FROM user_coin_transactions
    WHERE amount > 0
  );

  total_exp_burned := (
    SELECT COALESCE(SUM(ABS(amount)), 0)::bigint
    FROM user_exp_transactions
    WHERE amount < 0
  );

  daily_mint_rate := (
    SELECT COALESCE(SUM(amount), 0)::bigint
    FROM user_coin_transactions
    WHERE amount > 0 AND created_at >= now() - interval '24 hours'
  );

  daily_burn_rate := (
    SELECT COALESCE(SUM(ABS(amount)), 0)::bigint
    FROM user_coin_transactions
    WHERE type IN ('shop_purchase', 'boost_purchase') AND created_at >= now() - interval '24 hours'
  );

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."get_economy_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_economy_stats"() IS 'Read-only aggregate stats for admin economy dashboard.';



CREATE OR REPLACE FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") RETURNS TABLE("exp_earned" bigint, "milestone_600_claimed" boolean, "milestone_1800_claimed" boolean, "milestone_3600_claimed" boolean)
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


ALTER FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") IS 'Canonical EXP grant: user_levels, users.lifetime_exp, prestige, user_exp_daily, milestones, user_exp_transactions.';



CREATE OR REPLACE FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) RETURNS TABLE("exp_earned" bigint, "milestone_600_claimed" boolean, "milestone_1800_claimed" boolean, "milestone_3600_claimed" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM grant_user_exp(p_user_id, p_exp_seconds, p_date, 'call_duration');
END;
$$;


ALTER FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) IS 'Increments daily EXP (with exp_boost multiplier), grants milestone coins (with milestone_reward_multiplier and daily_reward_multiplier), writes exp_transaction.';



CREATE OR REPLACE FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_seconds IS NULL OR p_seconds <= 0 THEN RETURN; END IF;
  PERFORM * FROM grant_user_exp(p_user_id, p_seconds, (now() AT TIME ZONE 'UTC')::date, 'call_duration');
END;
$$;


ALTER FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) IS 'Increments user_levels and users.lifetime_exp; recalculates prestige_points, prestige_rank, prestige_tier.';



CREATE OR REPLACE FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO user_exp_daily (user_id, date, exp_seconds)
  VALUES (p_user_id, p_date, p_exp_seconds)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + p_exp_seconds,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) IS 'Increments daily EXP for a user on a specific date. Creates row if missing.';



CREATE OR REPLACE FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF p_day = p_days_in_month THEN
    RETURN 80;
  END IF;
  IF p_day >= 26 THEN
    RETURN LEAST(6 + (p_day - 26), 10);
  END IF;
  IF p_day <= 25 THEN
    RETURN 2 + ((p_day - 1) * 3 / 24)::integer;
  END IF;
  RETURN 0;
END;
$$;


ALTER FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE user_streaks
  SET last_valid_date = p_gap_date,
      last_continuation_used_freeze = true
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") IS 'Bridges a one-day gap for streak continuity by setting last_valid_date to the gap date; consumed freeze and last_continuation_used_freeze are handled by the application';



CREATE OR REPLACE FUNCTION "public"."prestige_user"("p_user_id" "uuid") RETURNS TABLE("vault_bonus" integer, "new_total_prestiges" integer, "prestige_rank" "public"."prestige_rank", "prestige_tier" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_exp bigint;
  v_level integer;
  v_total_prestiges integer;
  v_min_level integer := 50;
  v_min_exp bigint := 100000;
  v_mult integer := 50;
  v_vault_bonus integer;
  v_season_id uuid;
  v_config jsonb;
  v_rank "public"."prestige_rank";
  v_tier integer;
BEGIN
  SELECT ul.total_exp_seconds INTO v_total_exp
  FROM user_levels ul
  WHERE ul.user_id = p_user_id
  FOR UPDATE;

  IF v_total_exp IS NULL THEN
    INSERT INTO user_levels (user_id, total_exp_seconds) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RAISE EXCEPTION 'PRESTIGE_THRESHOLD_NOT_MET' USING errcode = 'check_violation';
  END IF;

  v_level := fn_exp_to_level(v_total_exp);

  SELECT u.total_prestiges INTO v_total_prestiges
  FROM users u
  WHERE u.id = p_user_id
  FOR UPDATE;

  IF v_total_prestiges IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING errcode = 'check_violation';
  END IF;

  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_min_level';
  IF v_config IS NOT NULL THEN
    v_min_level := (v_config#>>'{}')::integer;
  END IF;
  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_min_total_exp';
  IF v_config IS NOT NULL THEN
    v_min_exp := (v_config#>>'{}')::bigint;
  END IF;

  IF v_level < v_min_level AND v_total_exp < v_min_exp THEN
    RAISE EXCEPTION 'PRESTIGE_THRESHOLD_NOT_MET' USING errcode = 'check_violation';
  END IF;

  SELECT value_json INTO v_config FROM economy_config WHERE key = 'prestige_vault_multiplier';
  IF v_config IS NOT NULL THEN
    v_mult := (v_config#>>'{}')::integer;
  END IF;
  IF v_mult IS NULL OR v_mult <= 0 THEN
    v_mult := 50;
  END IF;

  v_total_prestiges := v_total_prestiges + 1;
  v_vault_bonus := v_total_prestiges * v_mult;

  UPDATE user_levels SET total_exp_seconds = 0 WHERE user_id = p_user_id;

  UPDATE users SET total_prestiges = v_total_prestiges WHERE id = p_user_id;

  INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent, vault_coin_balance)
  VALUES (p_user_id, 0, 0, 0, v_vault_bonus)
  ON CONFLICT (user_id) DO UPDATE SET
    vault_coin_balance = user_wallets.vault_coin_balance + v_vault_bonus;

  INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
  VALUES (
    p_user_id,
    'vault_deposit',
    v_vault_bonus,
    'prestige',
    jsonb_build_object('total_prestiges', v_total_prestiges, 'prestige_vault_multiplier', v_mult)
  );

  SELECT id INTO v_season_id FROM seasons WHERE is_active = true LIMIT 1;

  INSERT INTO user_prestige_history (user_id, season_id, exp_before_reset, level_before_reset, prestige_points_awarded)
  VALUES (p_user_id, v_season_id, v_total_exp, v_level, 0);

  SELECT u.prestige_rank, u.prestige_tier INTO v_rank, v_tier FROM users u WHERE u.id = p_user_id;

  vault_bonus := v_vault_bonus;
  new_total_prestiges := v_total_prestiges;
  prestige_user.prestige_rank := v_rank;
  prestige_user.prestige_tier := v_tier;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."prestige_user"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") IS 'Atomic prestige: reset EXP/level, increment total_prestiges, grant vault bonus, log history.';



CREATE OR REPLACE FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" "text") RETURNS TABLE("expires_at" timestamp with time zone, "new_coin_balance" integer)
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


ALTER FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" "text") IS 'Deducts coins and creates time-limited boost. Raises INVALID_BOOST_TYPE, INSUFFICIENT_COINS.';



CREATE OR REPLACE FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") RETURNS TABLE("new_coin_balance" integer)
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



CREATE OR REPLACE FUNCTION "public"."snapshot_economy_metrics"() RETURNS "void"
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



CREATE OR REPLACE FUNCTION "public"."trigger_update_streak_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM update_user_streak_summary(NEW.user_id, NEW.date, NEW.is_valid);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_streak_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_update_streak_summary"() IS 'Trigger function to automatically update streak summary when streak day is inserted or updated';



CREATE OR REPLACE FUNCTION "public"."update_call_history_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_call_history_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_changelogs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_changelogs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_coin_shop_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_coin_shop_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_interest_tags_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_interest_tags_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_level_feature_unlocks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_level_feature_unlocks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_level_rewards_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_level_rewards_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_seasons_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_seasons_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streak_exp_bonuses_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_streak_exp_bonuses_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_details_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_details_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_embeddings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_embeddings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_favorite_limits_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_favorite_limits_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_levels_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_levels_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_monthly_checkins_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_monthly_checkins_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_existing_summary RECORD;
  v_new_current_streak INTEGER;
  v_new_longest_streak INTEGER;
BEGIN
  SELECT current_streak, longest_streak, last_valid_date
  INTO v_existing_summary
  FROM user_streaks
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    IF p_is_valid THEN
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_valid_date)
      VALUES (p_user_id, 1, 1, p_date);
    ELSE
      INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_valid_date)
      VALUES (p_user_id, 0, 0, NULL);
    END IF;
    RETURN;
  END IF;
  
  IF NOT p_is_valid THEN
    UPDATE user_streaks
    SET current_streak = 0,
        last_valid_date = NULL
    WHERE user_id = p_user_id;
    RETURN;
  END IF;
  
  IF v_existing_summary.last_valid_date IS NULL THEN
    v_new_current_streak := 1;
  ELSIF v_existing_summary.last_valid_date = p_date - INTERVAL '1 day' THEN
    v_new_current_streak := v_existing_summary.current_streak + 1;
  ELSE
    v_new_current_streak := 1;
  END IF;
  
  v_new_longest_streak := GREATEST(v_existing_summary.longest_streak, v_new_current_streak);
  
  UPDATE user_streaks
  SET current_streak = v_new_current_streak,
      longest_streak = v_new_longest_streak,
      last_valid_date = p_date
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) IS 'Updates user streak summary. Handles increment/reset logic based on consecutive valid days.';



CREATE OR REPLACE FUNCTION "public"."update_user_streaks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_streaks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_wallets_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_wallets_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_weekly_checkins_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_weekly_checkins_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_users_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_users_updated_at"() IS 'Automatically updates the updated_at timestamp when a user record is updated';



CREATE OR REPLACE FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) RETURNS TABLE("first_time_valid" boolean, "current_streak" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_old_valid BOOLEAN := false;
  v_old_total INTEGER := 0;
  v_new_total INTEGER;
  v_is_valid BOOLEAN;
  v_found BOOLEAN := false;
  v_streak INTEGER := 0;
BEGIN
  SELECT is_valid, total_call_seconds INTO v_old_valid, v_old_total
  FROM user_streak_days
  WHERE user_id = p_user_id AND date = p_date;

  v_found := FOUND;
  IF NOT FOUND THEN
    v_old_valid := false;
    v_old_total := 0;
  END IF;
  v_new_total := v_old_total + p_total_call_seconds;
  v_is_valid := v_new_total >= 300;

  INSERT INTO user_streak_days (user_id, date, total_call_seconds, is_valid)
  VALUES (p_user_id, p_date, p_total_call_seconds, v_is_valid)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_call_seconds = user_streak_days.total_call_seconds + p_total_call_seconds,
    is_valid = (user_streak_days.total_call_seconds + p_total_call_seconds) >= 300;

  first_time_valid := (NOT v_found OR NOT v_old_valid) AND v_is_valid;

  IF first_time_valid OR v_is_valid THEN
    SELECT s.current_streak INTO v_streak
    FROM user_streaks s
    WHERE s.user_id = p_user_id;
    current_streak := COALESCE(v_streak, 0);
  ELSE
    current_streak := 0;
  END IF;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."interest_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "icon" character varying(50),
    "category" character varying(50),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."interest_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."interest_tags" IS 'Defines available interest tags that users can select';



COMMENT ON COLUMN "public"."interest_tags"."name" IS 'Unique name of the interest tag';



COMMENT ON COLUMN "public"."interest_tags"."description" IS 'Description of what this interest tag represents';



COMMENT ON COLUMN "public"."interest_tags"."icon" IS 'Icon identifier or emoji for the tag';



COMMENT ON COLUMN "public"."interest_tags"."category" IS 'Category grouping for the tag (e.g., sports, music, technology)';



COMMENT ON COLUMN "public"."interest_tags"."is_active" IS 'Whether this tag is currently active and available for selection';



CREATE TABLE IF NOT EXISTS "public"."user_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date_of_birth" "date",
    "gender" character varying(20),
    "languages" "text"[],
    "interest_tags" "uuid"[],
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "timezone" "text",
    CONSTRAINT "check_age" CHECK ((("date_of_birth" IS NULL) OR ("date_of_birth" <= CURRENT_DATE)))
);


ALTER TABLE "public"."user_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_details" IS 'Stores detailed user information for personalized filters and matching. All users should have a corresponding record (created automatically via trigger or backfilled)';



COMMENT ON COLUMN "public"."user_details"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_details"."date_of_birth" IS 'User date of birth for age calculation';



COMMENT ON COLUMN "public"."user_details"."gender" IS 'User gender';



COMMENT ON COLUMN "public"."user_details"."languages" IS 'Array of languages the user speaks';



COMMENT ON COLUMN "public"."user_details"."interest_tags" IS 'Array of interest tag IDs (UUID) referencing interest_tags table';



COMMENT ON COLUMN "public"."user_details"."bio" IS 'User biography or description';



COMMENT ON COLUMN "public"."user_details"."timezone" IS 'IANA timezone; set once for reward date gating, then locked.';



CREATE TABLE IF NOT EXISTS "public"."user_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "embedding" "public"."vector"(768),
    "model_name" character varying(100),
    "source_hash" character varying(64) DEFAULT ''::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "total_exp_seconds" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_total_exp_seconds" CHECK (("total_exp_seconds" >= 0))
);


ALTER TABLE "public"."user_levels" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_levels" IS 'Stores user experience points accumulated from call duration';



COMMENT ON COLUMN "public"."user_levels"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_levels"."total_exp_seconds" IS 'Total experience points in seconds accumulated from completed calls';



COMMENT ON COLUMN "public"."user_levels"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."user_levels"."updated_at" IS 'Timestamp when the record was last updated';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clerk_user_id" "text" NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "country" "text",
    "deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "prestige_rank" "public"."prestige_rank" DEFAULT 'plastic'::"public"."prestige_rank" NOT NULL,
    "prestige_tier" integer,
    "prestige_points" integer DEFAULT 0 NOT NULL,
    "lifetime_exp" bigint DEFAULT 0 NOT NULL,
    "total_prestiges" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "check_lifetime_exp" CHECK (("lifetime_exp" >= 0)),
    CONSTRAINT "check_prestige_points" CHECK (("prestige_points" >= 0)),
    CONSTRAINT "check_prestige_tier" CHECK ((("prestige_tier" IS NULL) OR (("prestige_tier" >= 1) AND ("prestige_tier" <= 3)))),
    CONSTRAINT "check_total_prestiges" CHECK (("total_prestiges" >= 0))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."prestige_rank" IS 'Current prestige rank from cumulative prestige points.';



COMMENT ON COLUMN "public"."users"."prestige_tier" IS '1-3 for ranks below transcendent; null for transcendent.';



COMMENT ON COLUMN "public"."users"."prestige_points" IS 'Cumulative floor(lifetime_exp / prestige_divisor); never decreases.';



COMMENT ON COLUMN "public"."users"."lifetime_exp" IS 'Total EXP ever earned; only increases on EXP add, not on conversion or prestige.';



COMMENT ON COLUMN "public"."users"."total_prestiges" IS 'Number of times user has prestiged.';



CREATE OR REPLACE VIEW "public"."admin_users_unified" AS
 SELECT "u"."id" AS "user_id",
    "u"."clerk_user_id",
    "u"."email",
    "u"."role",
    "u"."deleted",
    "u"."created_at",
    "u"."first_name",
    "u"."last_name",
    "u"."avatar_url",
    "u"."country",
    "u"."updated_at",
    "u"."deleted_at",
    "u"."prestige_rank",
    "u"."prestige_tier",
    "u"."prestige_points",
    "u"."lifetime_exp",
    "u"."total_prestiges",
    "ud"."bio",
    "ud"."gender",
    "ud"."date_of_birth",
    COALESCE(( SELECT "array_agg"("it"."name" ORDER BY "it"."name") AS "array_agg"
           FROM "public"."interest_tags" "it"
          WHERE ("it"."id" = ANY (COALESCE("ud"."interest_tags", '{}'::"uuid"[])))), ('{}'::"text"[])::character varying[]) AS "interest_tags",
    "ue"."model_name" AS "embedding_model",
    "ue"."source_hash" AS "embedding_source_hash",
    "ue"."updated_at" AS "embedding_updated_at",
    "ul"."total_exp_seconds"
   FROM ((("public"."users" "u"
     LEFT JOIN "public"."user_details" "ud" ON (("u"."id" = "ud"."user_id")))
     LEFT JOIN "public"."user_embeddings" "ue" ON (("u"."id" = "ue"."user_id")))
     LEFT JOIN "public"."user_levels" "ul" ON (("u"."id" = "ul"."user_id")));


ALTER VIEW "public"."admin_users_unified" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broadcast_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by_user_id" "uuid" NOT NULL,
    "title" "text",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."broadcast_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "caller_id" "uuid" NOT NULL,
    "callee_id" "uuid" NOT NULL,
    "caller_country" character varying(2),
    "callee_country" character varying(2),
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_different_users" CHECK (("caller_id" <> "callee_id")),
    CONSTRAINT "check_duration" CHECK ((("duration_seconds" IS NULL) OR ("duration_seconds" >= 0)))
);


ALTER TABLE "public"."call_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."call_history" IS 'Stores call history records with timestamps and country information';



COMMENT ON COLUMN "public"."call_history"."caller_id" IS 'User ID of the caller';



COMMENT ON COLUMN "public"."call_history"."callee_id" IS 'User ID of the callee';



COMMENT ON COLUMN "public"."call_history"."caller_country" IS 'Country code (ISO 3166-1 alpha-2) of the caller';



COMMENT ON COLUMN "public"."call_history"."callee_country" IS 'Country code (ISO 3166-1 alpha-2) of the callee';



COMMENT ON COLUMN "public"."call_history"."duration_seconds" IS 'Call duration in seconds, calculated from started_at and ended_at';



CREATE TABLE IF NOT EXISTS "public"."changelogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "version" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "release_date" timestamp with time zone NOT NULL,
    "s3_key" character varying(500) NOT NULL,
    "created_by" "uuid",
    "is_published" boolean DEFAULT false NOT NULL,
    "order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."changelogs" OWNER TO "postgres";


COMMENT ON TABLE "public"."changelogs" IS 'Stores changelog entries with version metadata and S3 references to markdown files';



COMMENT ON COLUMN "public"."changelogs"."version" IS 'Version identifier (e.g., "1.0.0", "2.1.3")';



COMMENT ON COLUMN "public"."changelogs"."title" IS 'Display title for the changelog entry';



COMMENT ON COLUMN "public"."changelogs"."release_date" IS 'When the version was released';



COMMENT ON COLUMN "public"."changelogs"."s3_key" IS 'S3 path to the markdown file (e.g., "changelogs/1.0.0.md")';



COMMENT ON COLUMN "public"."changelogs"."created_by" IS 'Admin user who created this changelog entry';



COMMENT ON COLUMN "public"."changelogs"."is_published" IS 'Whether this changelog is published and visible to users';



COMMENT ON COLUMN "public"."changelogs"."order" IS 'Custom sorting order (higher = more recent, null falls back to release_date)';



CREATE OR REPLACE VIEW "public"."changelogs_with_creator" AS
 SELECT "c"."id",
    "c"."version",
    "c"."title",
    "c"."release_date",
    "c"."s3_key",
    "c"."is_published",
    "c"."order",
    "c"."created_at",
    "c"."updated_at",
    "json_build_object"('id', "u"."id", 'clerk_user_id', "u"."clerk_user_id", 'email', "u"."email", 'first_name', "u"."first_name", 'last_name', "u"."last_name", 'avatar_url', "u"."avatar_url", 'country', "u"."country", 'role', "u"."role", 'created_at', "u"."created_at", 'updated_at', "u"."updated_at") AS "created_by"
   FROM ("public"."changelogs" "c"
     LEFT JOIN "public"."users" "u" ON (("c"."created_by" = "u"."id")));


ALTER VIEW "public"."changelogs_with_creator" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coin_shop_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "price" integer NOT NULL,
    "metadata" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_coin_shop_items_price" CHECK (("price" >= 0))
);


ALTER TABLE "public"."coin_shop_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."coin_shop_items" IS 'Cosmetic shop catalog. type: avatar_frame | reaction_pack | profile_effect | video_overlay';



CREATE TABLE IF NOT EXISTS "public"."economy_config" (
    "key" "text" NOT NULL,
    "value_json" "jsonb" NOT NULL
);


ALTER TABLE "public"."economy_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."economy_config" IS 'Tunable economy parameters; value_json holds numeric or small structure.';



CREATE TABLE IF NOT EXISTS "public"."economy_health_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "health_status" "public"."economy_health_status" NOT NULL,
    "metrics_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actions_taken" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."economy_health_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."economy_health_reports" IS 'Daily economy health summary and stabilizer actions.';



CREATE TABLE IF NOT EXISTS "public"."economy_metrics_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "total_coin_supply" bigint DEFAULT 0 NOT NULL,
    "total_vault_supply" bigint DEFAULT 0 NOT NULL,
    "total_exp_supply" bigint DEFAULT 0 NOT NULL,
    "total_coin_minted" bigint DEFAULT 0 NOT NULL,
    "total_coin_burned" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_exp_generated" bigint DEFAULT 0 NOT NULL,
    "total_exp_converted" bigint DEFAULT 0 NOT NULL,
    "active_users_count" bigint DEFAULT 0 NOT NULL,
    "avg_coin_per_user" numeric(18,4),
    "top_10_percent_ratio" numeric(5,4)
);


ALTER TABLE "public"."economy_metrics_daily" OWNER TO "postgres";


COMMENT ON TABLE "public"."economy_metrics_daily" IS 'Daily snapshot of economy aggregates for reporting.';



COMMENT ON COLUMN "public"."economy_metrics_daily"."total_exp_generated" IS 'Lifetime sum of positive EXP transaction amounts.';



COMMENT ON COLUMN "public"."economy_metrics_daily"."total_exp_converted" IS 'Lifetime sum of EXP burned (negative amounts) from conversions.';



COMMENT ON COLUMN "public"."economy_metrics_daily"."active_users_count" IS 'Distinct users with at least one coin transaction in the last 24h at snapshot time.';



COMMENT ON COLUMN "public"."economy_metrics_daily"."avg_coin_per_user" IS 'total_coin_supply / wallet count; null if no wallets.';



COMMENT ON COLUMN "public"."economy_metrics_daily"."top_10_percent_ratio" IS 'Sum of coin_balance of top decile (by balance) / total_coin_supply; 0 if supply is 0.';



CREATE TABLE IF NOT EXISTS "public"."favorite_exp_boost_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "one_way_multiplier" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "mutual_multiplier" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_mutual_multiplier" CHECK (("mutual_multiplier" >= 1.00)),
    CONSTRAINT "check_one_way_multiplier" CHECK (("one_way_multiplier" >= 1.00))
);


ALTER TABLE "public"."favorite_exp_boost_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."favorite_exp_boost_rules" IS 'Admin-defined EXP multipliers when calling with favorite (one-way vs mutual)';



CREATE TABLE IF NOT EXISTS "public"."level_feature_unlocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_required" integer NOT NULL,
    "feature_key" character varying(100) NOT NULL,
    "feature_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_level_required" CHECK (("level_required" > 0))
);


ALTER TABLE "public"."level_feature_unlocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."level_feature_unlocks" IS 'Admin-defined feature unlock rules based on level thresholds';



COMMENT ON COLUMN "public"."level_feature_unlocks"."level_required" IS 'Level at which this feature is unlocked';



COMMENT ON COLUMN "public"."level_feature_unlocks"."feature_key" IS 'String identifier for the feature (e.g., reaction_types, favorite_limit, avatar_frames)';



COMMENT ON COLUMN "public"."level_feature_unlocks"."feature_payload" IS 'Extensible JSON payload containing feature-specific configuration';



COMMENT ON COLUMN "public"."level_feature_unlocks"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."level_feature_unlocks"."updated_at" IS 'Timestamp when the record was last updated';



CREATE TABLE IF NOT EXISTS "public"."level_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_required" integer NOT NULL,
    "reward_type" character varying(100) NOT NULL,
    "reward_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_level_required" CHECK (("level_required" > 0))
);


ALTER TABLE "public"."level_rewards" OWNER TO "postgres";


COMMENT ON TABLE "public"."level_rewards" IS 'Admin-defined rewards granted at specific level milestones';



COMMENT ON COLUMN "public"."level_rewards"."level_required" IS 'Level at which this reward is granted';



COMMENT ON COLUMN "public"."level_rewards"."reward_type" IS 'Type identifier for the reward (e.g., avatar_frame, badge, currency)';



COMMENT ON COLUMN "public"."level_rewards"."reward_payload" IS 'Extensible JSON payload containing reward-specific data';



COMMENT ON COLUMN "public"."level_rewards"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."level_rewards"."updated_at" IS 'Timestamp when the record was last updated';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores persistent in-app notifications for users. Delivered via socket when online.';



CREATE OR REPLACE VIEW "public"."public_user_info" AS
 SELECT "u"."id",
    "u"."avatar_url",
    "u"."first_name",
    "u"."last_name",
    "ud"."date_of_birth",
    "ud"."gender",
    "ud"."bio",
    COALESCE(( SELECT "json_agg"("json_build_object"('id', "it"."id", 'name', "it"."name", 'description', "it"."description", 'icon', "it"."icon", 'category', "it"."category", 'is_active', "it"."is_active", 'created_at', "it"."created_at", 'updated_at', "it"."updated_at") ORDER BY "it"."name") AS "json_agg"
           FROM "public"."interest_tags" "it"
          WHERE (("it"."id" = ANY ("ud"."interest_tags")) AND ("it"."is_active" = true))), '[]'::json) AS "interest_tags"
   FROM ("public"."users" "u"
     LEFT JOIN "public"."user_details" "ud" ON (("u"."id" = "ud"."user_id")));


ALTER VIEW "public"."public_user_info" OWNER TO "postgres";


COMMENT ON VIEW "public"."public_user_info" IS 'Public user information view with expanded interest tags for user matching and display';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Stores Web Push API subscriptions for push notifications.';



CREATE TABLE IF NOT EXISTS "public"."report_contexts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "call_id" "uuid",
    "room_id" "text",
    "call_started_at" timestamp with time zone,
    "call_ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "reporter_role" "text",
    "reported_role" "text",
    "ended_by" "uuid",
    "reported_at_offset_seconds" integer,
    "chat_snapshot" "jsonb",
    "behavior_flags" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."report_contexts" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_contexts" IS 'Stores immutable context snapshots for user reports';



COMMENT ON COLUMN "public"."report_contexts"."report_id" IS 'Foreign key to reports table';



COMMENT ON COLUMN "public"."report_contexts"."call_id" IS 'Foreign key to call_history table if report is tied to a call';



COMMENT ON COLUMN "public"."report_contexts"."room_id" IS 'Room ID from RoomService if report was created during active call';



COMMENT ON COLUMN "public"."report_contexts"."call_started_at" IS 'Timestamp when the call started';



COMMENT ON COLUMN "public"."report_contexts"."call_ended_at" IS 'Timestamp when the call ended';



COMMENT ON COLUMN "public"."report_contexts"."duration_seconds" IS 'Call duration in seconds';



COMMENT ON COLUMN "public"."report_contexts"."reporter_role" IS 'Role of reporter: caller or callee';



COMMENT ON COLUMN "public"."report_contexts"."reported_role" IS 'Role of reported user: caller or callee';



COMMENT ON COLUMN "public"."report_contexts"."ended_by" IS 'User ID who ended or skipped the call';



COMMENT ON COLUMN "public"."report_contexts"."reported_at_offset_seconds" IS 'Seconds into call when report was created';



COMMENT ON COLUMN "public"."report_contexts"."chat_snapshot" IS 'JSONB snapshot of chat messages during call';



COMMENT ON COLUMN "public"."report_contexts"."behavior_flags" IS 'JSONB object containing call metadata and reporter-provided flags';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_user_id" "uuid" NOT NULL,
    "reported_user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_different_users" CHECK (("reporter_user_id" <> "reported_user_id")),
    CONSTRAINT "check_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::"text"[])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."reports" IS 'Stores user reports against other users';



COMMENT ON COLUMN "public"."reports"."reporter_user_id" IS 'User ID of the person making the report';



COMMENT ON COLUMN "public"."reports"."reported_user_id" IS 'User ID of the person being reported';



COMMENT ON COLUMN "public"."reports"."reason" IS 'Reason for the report provided by the reporter';



COMMENT ON COLUMN "public"."reports"."status" IS 'Status of the report: pending, reviewed, resolved, dismissed';



COMMENT ON COLUMN "public"."reports"."admin_notes" IS 'Admin notes about the report review';



COMMENT ON COLUMN "public"."reports"."reviewed_by" IS 'Admin user ID who reviewed the report';



COMMENT ON COLUMN "public"."reports"."reviewed_at" IS 'Timestamp when the report was reviewed';



CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "decay_threshold" integer DEFAULT 500 NOT NULL,
    "decay_rate" numeric(5,4) DEFAULT 0.3 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_decay_rate" CHECK ((("decay_rate" >= (0)::numeric) AND ("decay_rate" <= (1)::numeric))),
    CONSTRAINT "check_decay_threshold" CHECK (("decay_threshold" >= 0))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


COMMENT ON TABLE "public"."seasons" IS 'Seasonal periods for soft decay. Only one active season at a time.';



CREATE TABLE IF NOT EXISTS "public"."streak_exp_bonuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "min_streak" integer NOT NULL,
    "max_streak" integer NOT NULL,
    "bonus_multiplier" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_bonus_multiplier" CHECK (("bonus_multiplier" >= 1.00)),
    CONSTRAINT "check_max_streak" CHECK (("max_streak" >= "min_streak")),
    CONSTRAINT "check_min_streak" CHECK (("min_streak" >= 0))
);


ALTER TABLE "public"."streak_exp_bonuses" OWNER TO "postgres";


COMMENT ON TABLE "public"."streak_exp_bonuses" IS 'Admin-defined EXP bonus multipliers based on streak length ranges';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."min_streak" IS 'Minimum streak length (inclusive) for this bonus';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."max_streak" IS 'Maximum streak length (inclusive) for this bonus';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."bonus_multiplier" IS 'Multiplier applied to EXP when streak is within this range (e.g., 1.50 for 50% bonus)';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."created_at" IS 'Timestamp when the record was created';



COMMENT ON COLUMN "public"."streak_exp_bonuses"."updated_at" IS 'Timestamp when the record was last updated';



CREATE TABLE IF NOT EXISTS "public"."user_active_boosts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "boost_type" "text" NOT NULL,
    "multiplier" double precision NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_active_boosts" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_active_boosts" IS 'Time-limited boosts. boost_type: exp_boost_30m | daily_reward_multiplier';



CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_user_id" "uuid" NOT NULL,
    "blocked_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_different_users" CHECK (("blocker_user_id" <> "blocked_user_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_blocks" IS 'Stores user blocking relationships. Blocking prevents matchmaking, favorites interactions, and incoming calls.';



CREATE TABLE IF NOT EXISTS "public"."user_coin_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" integer NOT NULL,
    "source" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_coin_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_coin_transactions" IS 'Append-only ledger for coin movements.';



COMMENT ON COLUMN "public"."user_coin_transactions"."type" IS 'exp_conversion | level_reward | admin_adjustment';



CREATE OR REPLACE VIEW "public"."user_details_expanded" AS
 SELECT "id",
    "user_id",
    "date_of_birth",
    "gender",
    "languages",
    "bio",
    "created_at",
    "updated_at",
    COALESCE(( SELECT "json_agg"("json_build_object"('id', "it"."id", 'name', "it"."name", 'description', "it"."description", 'icon', "it"."icon", 'category', "it"."category", 'is_active', "it"."is_active", 'created_at', "it"."created_at", 'updated_at', "it"."updated_at") ORDER BY "it"."name") AS "json_agg"
           FROM "public"."interest_tags" "it"
          WHERE (("it"."id" = ANY ("ud"."interest_tags")) AND ("it"."is_active" = true))), '[]'::json) AS "interest_tags"
   FROM "public"."user_details" "ud";


ALTER VIEW "public"."user_details_expanded" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_details_expanded" IS 'User details with expanded interest tags as JSON array';



CREATE TABLE IF NOT EXISTS "public"."user_exp_daily" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "exp_seconds" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "milestone_600_claimed" boolean DEFAULT false NOT NULL,
    "milestone_1800_claimed" boolean DEFAULT false NOT NULL,
    "milestone_3600_claimed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "check_exp_seconds" CHECK (("exp_seconds" >= 0))
);


ALTER TABLE "public"."user_exp_daily" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_exp_daily" IS 'Stores daily EXP totals (with bonuses) for each user. This is the source of truth for expEarnedToday calculations.';



COMMENT ON COLUMN "public"."user_exp_daily"."user_id" IS 'Foreign key reference to users table';



COMMENT ON COLUMN "public"."user_exp_daily"."date" IS 'Local date (YYYY-MM-DD) in user timezone when EXP was earned';



COMMENT ON COLUMN "public"."user_exp_daily"."exp_seconds" IS 'Total EXP earned on this date (includes streak and favorite bonuses)';



COMMENT ON COLUMN "public"."user_exp_daily"."milestone_600_claimed" IS 'Daily milestone 600 EXP -> 2 coins claimed for this date';



COMMENT ON COLUMN "public"."user_exp_daily"."milestone_1800_claimed" IS 'Daily milestone 1800 EXP -> 6 coins claimed for this date';



COMMENT ON COLUMN "public"."user_exp_daily"."milestone_3600_claimed" IS 'Daily milestone 3600 EXP -> 12 coins claimed for this date';



CREATE TABLE IF NOT EXISTS "public"."user_exp_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" integer NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_exp_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_exp_transactions" IS 'Append-only ledger for EXP movements.';



COMMENT ON COLUMN "public"."user_exp_transactions"."type" IS 'call_duration | exp_conversion | admin_adjustment';



CREATE TABLE IF NOT EXISTS "public"."user_favorite_limits" (
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "used_count" integer DEFAULT 0 NOT NULL,
    "daily_limit" integer DEFAULT 10 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_favorite_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_favorite_limits" IS 'Tracks daily favorite usage limits per user';



COMMENT ON COLUMN "public"."user_favorite_limits"."user_id" IS 'The user whose limit is being tracked';



COMMENT ON COLUMN "public"."user_favorite_limits"."date" IS 'The date for which the limit applies';



COMMENT ON COLUMN "public"."user_favorite_limits"."used_count" IS 'Number of favorites added on this date';



COMMENT ON COLUMN "public"."user_favorite_limits"."daily_limit" IS 'Maximum favorites allowed per day';



CREATE TABLE IF NOT EXISTS "public"."user_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "favorite_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_favorites_not_self" CHECK (("user_id" <> "favorite_user_id"))
);


ALTER TABLE "public"."user_favorites" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_favorites" IS 'Stores unilateral favorite relationships between users';



COMMENT ON COLUMN "public"."user_favorites"."user_id" IS 'The user who is marking someone as favorite';



COMMENT ON COLUMN "public"."user_favorites"."favorite_user_id" IS 'The user being marked as favorite';



CREATE OR REPLACE VIEW "public"."user_favorites_with_stats" AS
 SELECT "uf"."id",
    "uf"."user_id",
    "uf"."favorite_user_id",
    "uf"."created_at",
    "u"."clerk_user_id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."avatar_url",
    "u"."country",
    COALESCE("match_stats"."match_count", (0)::bigint) AS "match_count",
    COALESCE("match_stats"."total_duration", (0)::bigint) AS "total_duration",
        CASE
            WHEN (COALESCE("match_stats"."match_count", (0)::bigint) > 0) THEN (COALESCE("match_stats"."total_duration", (0)::bigint) / "match_stats"."match_count")
            ELSE (0)::bigint
        END AS "average_duration"
   FROM (("public"."user_favorites" "uf"
     JOIN "public"."users" "u" ON (("uf"."favorite_user_id" = "u"."id")))
     LEFT JOIN ( SELECT
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."caller_id"
                    ELSE "ch"."callee_id"
                END AS "user_a",
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."callee_id"
                    ELSE "ch"."caller_id"
                END AS "user_b",
            "count"(*) AS "match_count",
            "sum"(COALESCE("ch"."duration_seconds", 0)) AS "total_duration"
           FROM "public"."call_history" "ch"
          WHERE ("ch"."duration_seconds" IS NOT NULL)
          GROUP BY
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."caller_id"
                    ELSE "ch"."callee_id"
                END,
                CASE
                    WHEN ("ch"."caller_id" < "ch"."callee_id") THEN "ch"."callee_id"
                    ELSE "ch"."caller_id"
                END) "match_stats" ON (((("uf"."user_id" = "match_stats"."user_a") AND ("uf"."favorite_user_id" = "match_stats"."user_b")) OR (("uf"."user_id" = "match_stats"."user_b") AND ("uf"."favorite_user_id" = "match_stats"."user_a")))));


ALTER VIEW "public"."user_favorites_with_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_favorites_with_stats" IS 'User favorites with call statistics including match count, total duration, and average duration';



CREATE TABLE IF NOT EXISTS "public"."user_level_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "level_reward_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_level_rewards" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_level_rewards" IS 'Tracks which level rewards have been granted to each user';



COMMENT ON COLUMN "public"."user_level_rewards"."user_id" IS 'Foreign key reference to users table';



COMMENT ON COLUMN "public"."user_level_rewards"."level_reward_id" IS 'Foreign key reference to level_rewards table';



COMMENT ON COLUMN "public"."user_level_rewards"."granted_at" IS 'Timestamp when the reward was granted to the user';



CREATE TABLE IF NOT EXISTS "public"."user_monthly_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "claimed_days" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "buyback_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_monthly_checkins" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_monthly_checkins" IS 'Monthly check-in claimed days and buyback count per user per month.';



CREATE TABLE IF NOT EXISTS "public"."user_owned_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "acquired_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_owned_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_owned_items" IS 'Permanent cosmetic ownership per user';



CREATE TABLE IF NOT EXISTS "public"."user_prestige_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "season_id" "uuid",
    "exp_before_reset" bigint NOT NULL,
    "level_before_reset" integer NOT NULL,
    "prestige_points_awarded" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_prestige_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_prestige_history" IS 'Log of each prestige reset for a user.';



CREATE TABLE IF NOT EXISTS "public"."user_season_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "decay_processed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_season_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_season_records" IS 'Tracks per-user decay processing per season for idempotency.';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "default_mute_mic" boolean DEFAULT false NOT NULL,
    "default_disable_camera" boolean DEFAULT false NOT NULL,
    "notification_sound_enabled" boolean DEFAULT true NOT NULL,
    "notification_preferences" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'Stores user preferences and call settings. All users should have a corresponding record (created automatically via trigger or backfilled)';



COMMENT ON COLUMN "public"."user_settings"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_settings"."default_mute_mic" IS 'Default microphone mute state for calls';



COMMENT ON COLUMN "public"."user_settings"."default_disable_camera" IS 'Default camera disabled state for calls';



COMMENT ON COLUMN "public"."user_settings"."notification_sound_enabled" IS 'Whether notification sounds are enabled';



COMMENT ON COLUMN "public"."user_settings"."notification_preferences" IS 'JSON object for extensible notification preferences';



CREATE OR REPLACE VIEW "public"."user_settings_v" AS
 SELECT "us"."id",
    "us"."user_id",
    "u"."clerk_user_id",
    "us"."default_mute_mic",
    "us"."default_disable_camera",
    "us"."notification_sound_enabled",
    "us"."notification_preferences",
    "us"."created_at",
    "us"."updated_at"
   FROM ("public"."user_settings" "us"
     LEFT JOIN "public"."users" "u" ON (("us"."user_id" = "u"."id")));


ALTER VIEW "public"."user_settings_v" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_settings_v" IS 'User settings with user information';



CREATE TABLE IF NOT EXISTS "public"."user_streak_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "total_call_seconds" integer DEFAULT 0 NOT NULL,
    "is_valid" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_total_call_seconds" CHECK (("total_call_seconds" >= 0))
);


ALTER TABLE "public"."user_streak_days" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_streak_days" IS 'Stores daily call duration records for streak calculation';



COMMENT ON COLUMN "public"."user_streak_days"."user_id" IS 'Foreign key reference to users table';



COMMENT ON COLUMN "public"."user_streak_days"."date" IS 'UTC date for the streak day';



COMMENT ON COLUMN "public"."user_streak_days"."total_call_seconds" IS 'Total call duration in seconds for this UTC day';



COMMENT ON COLUMN "public"."user_streak_days"."is_valid" IS 'Whether this day counts as a valid streak day (>= 300 seconds)';



COMMENT ON COLUMN "public"."user_streak_days"."created_at" IS 'Timestamp when the record was created';



CREATE TABLE IF NOT EXISTS "public"."user_streak_freeze_grants" (
    "user_id" "uuid" NOT NULL,
    "level_feature_unlock_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_streak_freeze_grants" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_streak_freeze_grants" IS 'Tracks which level feature unlocks have granted streak freezes to avoid double-granting';



CREATE TABLE IF NOT EXISTS "public"."user_streak_freeze_inventory" (
    "user_id" "uuid" NOT NULL,
    "available_count" integer DEFAULT 0 NOT NULL,
    "total_used" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_available_count" CHECK (("available_count" >= 0)),
    CONSTRAINT "check_total_used" CHECK (("total_used" >= 0))
);


ALTER TABLE "public"."user_streak_freeze_inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_streak_freeze_inventory" IS 'Tracks available and used streak freezes per user';



CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_valid_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_continuation_used_freeze" boolean DEFAULT false NOT NULL,
    CONSTRAINT "check_current_streak" CHECK (("current_streak" >= 0)),
    CONSTRAINT "check_longest_streak" CHECK (("longest_streak" >= 0))
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_streaks" IS 'Stores user streak summary with current and longest streak';



COMMENT ON COLUMN "public"."user_streaks"."user_id" IS 'Foreign key reference to users table (one-to-one relationship)';



COMMENT ON COLUMN "public"."user_streaks"."current_streak" IS 'Current consecutive valid streak days';



COMMENT ON COLUMN "public"."user_streaks"."longest_streak" IS 'Longest streak achieved by the user';



COMMENT ON COLUMN "public"."user_streaks"."last_valid_date" IS 'Last UTC date that was a valid streak day';



COMMENT ON COLUMN "public"."user_streaks"."updated_at" IS 'Timestamp when the record was last updated';



COMMENT ON COLUMN "public"."user_streaks"."last_continuation_used_freeze" IS 'True when the most recent streak continuation used a freeze to bridge a one-day gap';



CREATE TABLE IF NOT EXISTS "public"."user_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "coin_balance" integer DEFAULT 0 NOT NULL,
    "total_earned" integer DEFAULT 0 NOT NULL,
    "total_spent" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "vault_coin_balance" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "check_coin_balance" CHECK (("coin_balance" >= 0)),
    CONSTRAINT "check_total_earned" CHECK (("total_earned" >= 0)),
    CONSTRAINT "check_total_spent" CHECK (("total_spent" >= 0)),
    CONSTRAINT "check_vault_coin_balance" CHECK (("vault_coin_balance" >= 0))
);


ALTER TABLE "public"."user_wallets" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_wallets" IS 'One wallet per user for coin balance and lifetime stats.';



CREATE TABLE IF NOT EXISTS "public"."user_weekly_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "streak_day" integer DEFAULT 0 NOT NULL,
    "last_checkin_local_date" "date",
    "total_weeks_completed" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_weekly_checkins" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_weekly_checkins" IS 'Weekly check-in streak and reward state per user.';



CREATE OR REPLACE VIEW "public"."users_with_details" AS
 SELECT "u"."id",
    "u"."clerk_user_id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."avatar_url",
    "u"."country",
    "u"."role",
    "u"."created_at" AS "user_created_at",
    "u"."updated_at" AS "user_updated_at",
    "ud"."id" AS "details_id",
    "ud"."date_of_birth",
    "ud"."gender",
    "ud"."languages",
    "ud"."bio",
    "ud"."created_at" AS "details_created_at",
    "ud"."updated_at" AS "details_updated_at",
    COALESCE(( SELECT "json_agg"("json_build_object"('id', "it"."id", 'name', "it"."name", 'description', "it"."description", 'icon', "it"."icon", 'category', "it"."category", 'is_active', "it"."is_active", 'created_at', "it"."created_at", 'updated_at', "it"."updated_at") ORDER BY "it"."name") AS "json_agg"
           FROM "public"."interest_tags" "it"
          WHERE (("it"."id" = ANY ("ud"."interest_tags")) AND ("it"."is_active" = true))), '[]'::json) AS "interest_tags"
   FROM ("public"."users" "u"
     LEFT JOIN "public"."user_details" "ud" ON (("u"."id" = "ud"."user_id")));


ALTER VIEW "public"."users_with_details" OWNER TO "postgres";


ALTER TABLE ONLY "public"."broadcast_history"
    ADD CONSTRAINT "broadcast_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."changelogs"
    ADD CONSTRAINT "changelogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."changelogs"
    ADD CONSTRAINT "changelogs_version_key" UNIQUE ("version");



ALTER TABLE ONLY "public"."coin_shop_items"
    ADD CONSTRAINT "coin_shop_items_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."coin_shop_items"
    ADD CONSTRAINT "coin_shop_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."economy_config"
    ADD CONSTRAINT "economy_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."economy_health_reports"
    ADD CONSTRAINT "economy_health_reports_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."economy_health_reports"
    ADD CONSTRAINT "economy_health_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."economy_metrics_daily"
    ADD CONSTRAINT "economy_metrics_daily_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."economy_metrics_daily"
    ADD CONSTRAINT "economy_metrics_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_exp_boost_rules"
    ADD CONSTRAINT "favorite_exp_boost_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interest_tags"
    ADD CONSTRAINT "interest_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."interest_tags"
    ADD CONSTRAINT "interest_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."level_feature_unlocks"
    ADD CONSTRAINT "level_feature_unlocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."level_rewards"
    ADD CONSTRAINT "level_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "report_contexts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "report_contexts_report_id_key" UNIQUE ("report_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streak_exp_bonuses"
    ADD CONSTRAINT "streak_exp_bonuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."level_feature_unlocks"
    ADD CONSTRAINT "unique_level_feature" UNIQUE ("level_required", "feature_key");



ALTER TABLE ONLY "public"."level_rewards"
    ADD CONSTRAINT "unique_level_reward" UNIQUE ("level_required", "reward_type");



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "unique_user_level_reward" UNIQUE ("user_id", "level_reward_id");



ALTER TABLE ONLY "public"."user_streak_days"
    ADD CONSTRAINT "unique_user_streak_day" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_active_boosts"
    ADD CONSTRAINT "user_active_boosts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_unique" UNIQUE ("blocker_user_id", "blocked_user_id");



ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "user_coin_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_embeddings"
    ADD CONSTRAINT "user_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_embeddings"
    ADD CONSTRAINT "user_embeddings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_exp_daily"
    ADD CONSTRAINT "user_exp_daily_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_exp_daily"
    ADD CONSTRAINT "user_exp_daily_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."user_exp_transactions"
    ADD CONSTRAINT "user_exp_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorite_limits"
    ADD CONSTRAINT "user_favorite_limits_pkey" PRIMARY KEY ("user_id", "date");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_unique" UNIQUE ("user_id", "favorite_user_id");



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "user_level_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_levels"
    ADD CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_levels"
    ADD CONSTRAINT "user_levels_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_monthly_checkins"
    ADD CONSTRAINT "user_monthly_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_monthly_checkins"
    ADD CONSTRAINT "user_monthly_checkins_user_id_year_month_key" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."user_owned_items"
    ADD CONSTRAINT "user_owned_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_owned_items"
    ADD CONSTRAINT "user_owned_items_user_id_item_id_key" UNIQUE ("user_id", "item_id");



ALTER TABLE ONLY "public"."user_prestige_history"
    ADD CONSTRAINT "user_prestige_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_season_records"
    ADD CONSTRAINT "user_season_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_season_records"
    ADD CONSTRAINT "user_season_records_user_season_key" UNIQUE ("user_id", "season_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_streak_days"
    ADD CONSTRAINT "user_streak_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_streak_freeze_grants"
    ADD CONSTRAINT "user_streak_freeze_grants_pkey" PRIMARY KEY ("user_id", "level_feature_unlock_id");



ALTER TABLE ONLY "public"."user_streak_freeze_inventory"
    ADD CONSTRAINT "user_streak_freeze_inventory_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_wallets"
    ADD CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_wallets"
    ADD CONSTRAINT "user_wallets_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_weekly_checkins"
    ADD CONSTRAINT "user_weekly_checkins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_weekly_checkins"
    ADD CONSTRAINT "user_weekly_checkins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_clerk_user_id_key" UNIQUE ("clerk_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "broadcast_history_created_at_idx" ON "public"."broadcast_history" USING "btree" ("created_at" DESC);



CREATE INDEX "broadcast_history_created_by_idx" ON "public"."broadcast_history" USING "btree" ("created_by_user_id");



CREATE INDEX "idx_call_history_callee_id" ON "public"."call_history" USING "btree" ("callee_id");



CREATE INDEX "idx_call_history_caller_callee" ON "public"."call_history" USING "btree" ("caller_id", "callee_id");



CREATE INDEX "idx_call_history_caller_id" ON "public"."call_history" USING "btree" ("caller_id");



CREATE INDEX "idx_call_history_started_at" ON "public"."call_history" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_changelogs_is_published" ON "public"."changelogs" USING "btree" ("is_published");



CREATE INDEX "idx_changelogs_order" ON "public"."changelogs" USING "btree" ("order" DESC NULLS LAST);



CREATE INDEX "idx_changelogs_release_date" ON "public"."changelogs" USING "btree" ("release_date" DESC);



CREATE INDEX "idx_changelogs_version" ON "public"."changelogs" USING "btree" ("version");



CREATE INDEX "idx_coin_shop_items_is_active" ON "public"."coin_shop_items" USING "btree" ("is_active");



CREATE INDEX "idx_economy_health_reports_date" ON "public"."economy_health_reports" USING "btree" ("date" DESC);



CREATE INDEX "idx_economy_metrics_daily_date" ON "public"."economy_metrics_daily" USING "btree" ("date" DESC);



CREATE INDEX "idx_interest_tags_category" ON "public"."interest_tags" USING "btree" ("category");



CREATE INDEX "idx_interest_tags_is_active" ON "public"."interest_tags" USING "btree" ("is_active");



CREATE INDEX "idx_interest_tags_name" ON "public"."interest_tags" USING "btree" ("name");



CREATE INDEX "idx_level_feature_unlocks_feature_key" ON "public"."level_feature_unlocks" USING "btree" ("feature_key");



CREATE INDEX "idx_level_feature_unlocks_level_required" ON "public"."level_feature_unlocks" USING "btree" ("level_required");



CREATE INDEX "idx_level_rewards_level_required" ON "public"."level_rewards" USING "btree" ("level_required");



CREATE INDEX "idx_level_rewards_reward_type" ON "public"."level_rewards" USING "btree" ("reward_type");



CREATE INDEX "idx_report_contexts_call_id" ON "public"."report_contexts" USING "btree" ("call_id");



CREATE INDEX "idx_report_contexts_created_at" ON "public"."report_contexts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_report_contexts_report_id" ON "public"."report_contexts" USING "btree" ("report_id");



CREATE INDEX "idx_reports_created_at" ON "public"."reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reports_reported_user_id" ON "public"."reports" USING "btree" ("reported_user_id");



CREATE INDEX "idx_reports_reporter_user_id" ON "public"."reports" USING "btree" ("reporter_user_id");



CREATE INDEX "idx_reports_reviewed_by" ON "public"."reports" USING "btree" ("reviewed_by");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_seasons_single_active" ON "public"."seasons" USING "btree" ((true)) WHERE ("is_active" = true);



CREATE INDEX "idx_streak_exp_bonuses_max_streak" ON "public"."streak_exp_bonuses" USING "btree" ("max_streak");



CREATE INDEX "idx_streak_exp_bonuses_min_streak" ON "public"."streak_exp_bonuses" USING "btree" ("min_streak");



CREATE INDEX "idx_user_active_boosts_user_expires" ON "public"."user_active_boosts" USING "btree" ("user_id", "expires_at");



CREATE INDEX "idx_user_coin_transactions_created_at" ON "public"."user_coin_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_coin_transactions_user_id" ON "public"."user_coin_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_user_details_gender" ON "public"."user_details" USING "btree" ("gender");



CREATE INDEX "idx_user_details_interest_tags" ON "public"."user_details" USING "gin" ("interest_tags");



CREATE INDEX "idx_user_details_languages" ON "public"."user_details" USING "gin" ("languages");



CREATE INDEX "idx_user_details_user_id" ON "public"."user_details" USING "btree" ("user_id");



CREATE INDEX "idx_user_embeddings_embedding_ivfflat" ON "public"."user_embeddings" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='1');



CREATE INDEX "idx_user_embeddings_source_hash" ON "public"."user_embeddings" USING "btree" ("source_hash");



CREATE INDEX "idx_user_embeddings_user_id" ON "public"."user_embeddings" USING "btree" ("user_id");



CREATE INDEX "idx_user_exp_transactions_created_at" ON "public"."user_exp_transactions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_exp_transactions_user_id" ON "public"."user_exp_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_user_favorite_limits_date" ON "public"."user_favorite_limits" USING "btree" ("date");



CREATE INDEX "idx_user_favorite_limits_user_id" ON "public"."user_favorite_limits" USING "btree" ("user_id");



CREATE INDEX "idx_user_favorites_created_at" ON "public"."user_favorites" USING "btree" ("created_at");



CREATE INDEX "idx_user_favorites_favorite_user_id" ON "public"."user_favorites" USING "btree" ("favorite_user_id");



CREATE INDEX "idx_user_favorites_user_id" ON "public"."user_favorites" USING "btree" ("user_id");



CREATE INDEX "idx_user_level_rewards_granted_at" ON "public"."user_level_rewards" USING "btree" ("granted_at" DESC);



CREATE INDEX "idx_user_level_rewards_level_reward_id" ON "public"."user_level_rewards" USING "btree" ("level_reward_id");



CREATE INDEX "idx_user_level_rewards_user_id" ON "public"."user_level_rewards" USING "btree" ("user_id");



CREATE INDEX "idx_user_levels_total_exp_seconds" ON "public"."user_levels" USING "btree" ("total_exp_seconds" DESC);



CREATE INDEX "idx_user_levels_user_id" ON "public"."user_levels" USING "btree" ("user_id");



CREATE INDEX "idx_user_monthly_checkins_user_year_month" ON "public"."user_monthly_checkins" USING "btree" ("user_id", "year", "month");



CREATE INDEX "idx_user_owned_items_user_id" ON "public"."user_owned_items" USING "btree" ("user_id");



CREATE INDEX "idx_user_prestige_history_created_at" ON "public"."user_prestige_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_prestige_history_user_id" ON "public"."user_prestige_history" USING "btree" ("user_id");



CREATE INDEX "idx_user_season_records_season" ON "public"."user_season_records" USING "btree" ("season_id");



CREATE INDEX "idx_user_season_records_user" ON "public"."user_season_records" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_user_streak_days_date" ON "public"."user_streak_days" USING "btree" ("date" DESC);



CREATE INDEX "idx_user_streak_days_is_valid" ON "public"."user_streak_days" USING "btree" ("user_id", "is_valid", "date" DESC);



CREATE INDEX "idx_user_streak_days_user_date" ON "public"."user_streak_days" USING "btree" ("user_id", "date" DESC);



CREATE INDEX "idx_user_streak_days_user_id" ON "public"."user_streak_days" USING "btree" ("user_id");



CREATE INDEX "idx_user_streak_freeze_grants_user_id" ON "public"."user_streak_freeze_grants" USING "btree" ("user_id");



CREATE INDEX "idx_user_streak_freeze_inventory_user_id" ON "public"."user_streak_freeze_inventory" USING "btree" ("user_id");



CREATE INDEX "idx_user_streaks_current_streak" ON "public"."user_streaks" USING "btree" ("current_streak" DESC);



CREATE INDEX "idx_user_streaks_longest_streak" ON "public"."user_streaks" USING "btree" ("longest_streak" DESC);



CREATE INDEX "idx_user_streaks_user_id" ON "public"."user_streaks" USING "btree" ("user_id");



CREATE INDEX "idx_user_wallets_user_id" ON "public"."user_wallets" USING "btree" ("user_id");



CREATE INDEX "idx_user_weekly_checkins_user_id" ON "public"."user_weekly_checkins" USING "btree" ("user_id");



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_is_read_idx" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "notifications_user_unread_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "user_blocks_blocked_idx" ON "public"."user_blocks" USING "btree" ("blocked_user_id");



CREATE INDEX "user_blocks_blocker_idx" ON "public"."user_blocks" USING "btree" ("blocker_user_id");



CREATE INDEX "user_exp_daily_user_id_date_idx" ON "public"."user_exp_daily" USING "btree" ("user_id", "date");



CREATE OR REPLACE TRIGGER "trg_users_after_insert_init_settings" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."fn_init_user_settings"();



CREATE OR REPLACE TRIGGER "trigger_create_user_details_on_user_insert" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_details_on_user_insert"();



CREATE OR REPLACE TRIGGER "trigger_create_user_embedding_on_user_insert" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_embedding_on_user_insert"();



CREATE OR REPLACE TRIGGER "trigger_update_call_history_updated_at" BEFORE UPDATE ON "public"."call_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_call_history_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_changelogs_updated_at" BEFORE UPDATE ON "public"."changelogs" FOR EACH ROW EXECUTE FUNCTION "public"."update_changelogs_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_coin_shop_items_updated_at" BEFORE UPDATE ON "public"."coin_shop_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_coin_shop_items_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_favorite_exp_boost_rules_updated_at" BEFORE UPDATE ON "public"."favorite_exp_boost_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_interest_tags_updated_at" BEFORE UPDATE ON "public"."interest_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_interest_tags_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_level_feature_unlocks_updated_at" BEFORE UPDATE ON "public"."level_feature_unlocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_level_feature_unlocks_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_level_rewards_updated_at" BEFORE UPDATE ON "public"."level_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_level_rewards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_reports_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_seasons_updated_at" BEFORE UPDATE ON "public"."seasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_seasons_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_streak_exp_bonuses_updated_at" BEFORE UPDATE ON "public"."streak_exp_bonuses" FOR EACH ROW EXECUTE FUNCTION "public"."update_streak_exp_bonuses_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_details_updated_at" BEFORE UPDATE ON "public"."user_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_details_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_embeddings_updated_at" BEFORE UPDATE ON "public"."user_embeddings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_embeddings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_levels_updated_at" BEFORE UPDATE ON "public"."user_levels" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_levels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_monthly_checkins_updated_at" BEFORE UPDATE ON "public"."user_monthly_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_monthly_checkins_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_streaks_updated_at" BEFORE UPDATE ON "public"."user_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_streaks_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_wallets_updated_at" BEFORE UPDATE ON "public"."user_wallets" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_wallets_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_weekly_checkins_updated_at" BEFORE UPDATE ON "public"."user_weekly_checkins" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_weekly_checkins_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_users_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_user_details_timezone_immutable" BEFORE UPDATE ON "public"."user_details" FOR EACH ROW EXECUTE FUNCTION "public"."fn_user_details_timezone_immutable"();



CREATE OR REPLACE TRIGGER "trigger_user_streak_days_update_summary" AFTER INSERT OR UPDATE OF "is_valid", "total_call_seconds" ON "public"."user_streak_days" FOR EACH ROW WHEN (("new"."is_valid" = true)) EXECUTE FUNCTION "public"."trigger_update_streak_summary"();



CREATE OR REPLACE TRIGGER "user_favorite_limits_updated_at_trigger" BEFORE UPDATE ON "public"."user_favorite_limits" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_favorite_limits_updated_at"();



ALTER TABLE ONLY "public"."broadcast_history"
    ADD CONSTRAINT "broadcast_history_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "fk_call_history_callee" FOREIGN KEY ("callee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "fk_call_history_caller" FOREIGN KEY ("caller_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."changelogs"
    ADD CONSTRAINT "fk_changelogs_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "fk_report_contexts_call" FOREIGN KEY ("call_id") REFERENCES "public"."call_history"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "fk_report_contexts_ended_by" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "fk_report_contexts_report" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "fk_reports_reported" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "fk_reports_reporter" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "fk_reports_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_active_boosts"
    ADD CONSTRAINT "fk_user_active_boosts_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_coin_transactions"
    ADD CONSTRAINT "fk_user_coin_transactions_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "fk_user_details_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_embeddings"
    ADD CONSTRAINT "fk_user_embeddings_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_exp_transactions"
    ADD CONSTRAINT "fk_user_exp_transactions_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "fk_user_level_rewards_reward" FOREIGN KEY ("level_reward_id") REFERENCES "public"."level_rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "fk_user_level_rewards_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_levels"
    ADD CONSTRAINT "fk_user_levels_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_monthly_checkins"
    ADD CONSTRAINT "fk_user_monthly_checkins_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_owned_items"
    ADD CONSTRAINT "fk_user_owned_items_item" FOREIGN KEY ("item_id") REFERENCES "public"."coin_shop_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_owned_items"
    ADD CONSTRAINT "fk_user_owned_items_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_prestige_history"
    ADD CONSTRAINT "fk_user_prestige_history_season" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_prestige_history"
    ADD CONSTRAINT "fk_user_prestige_history_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_season_records"
    ADD CONSTRAINT "fk_user_season_records_season" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_season_records"
    ADD CONSTRAINT "fk_user_season_records_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "fk_user_settings_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streak_days"
    ADD CONSTRAINT "fk_user_streak_days_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streak_freeze_grants"
    ADD CONSTRAINT "fk_user_streak_freeze_grants_unlock" FOREIGN KEY ("level_feature_unlock_id") REFERENCES "public"."level_feature_unlocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streak_freeze_grants"
    ADD CONSTRAINT "fk_user_streak_freeze_grants_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streak_freeze_inventory"
    ADD CONSTRAINT "fk_user_streak_freeze_inventory_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "fk_user_streaks_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_wallets"
    ADD CONSTRAINT "fk_user_wallets_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_weekly_checkins"
    ADD CONSTRAINT "fk_user_weekly_checkins_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorite_limits"
    ADD CONSTRAINT "user_favorite_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_favorite_user_id_fkey" FOREIGN KEY ("favorite_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_favorites"
    ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."economy_config" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_user_seasonal_decay"("p_user_id" "uuid", "p_season_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_exp_to_coin"("p_user_id" "uuid", "p_exp_amount" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer, "p_threshold" double precision, "p_exclude_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer, "p_threshold" double precision, "p_exclude_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer, "p_threshold" double precision, "p_exclude_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_prestige_rank_tier"("p_prestige_points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_user_details_timezone_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_user_details_timezone_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_user_details_timezone_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_economy_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."prestige_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_boost"("p_user_id" "uuid", "p_boost_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."purchase_shop_item"("p_user_id" "uuid", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."snapshot_economy_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_changelogs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_changelogs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_changelogs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_coin_shop_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_coin_shop_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_coin_shop_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_interest_tags_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_interest_tags_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_interest_tags_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_level_feature_unlocks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_level_feature_unlocks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_level_feature_unlocks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_level_rewards_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_level_rewards_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_level_rewards_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reports_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_seasons_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_seasons_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_seasons_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streak_exp_bonuses_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_streak_exp_bonuses_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streak_exp_bonuses_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_details_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_details_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_details_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_embeddings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_embeddings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_embeddings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_favorite_limits_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_favorite_limits_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_favorite_limits_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_levels_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_levels_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_levels_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_monthly_checkins_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_wallets_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_weekly_checkins_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "service_role";



GRANT ALL ON TABLE "public"."interest_tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_details" TO "service_role";



GRANT ALL ON TABLE "public"."user_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."user_levels" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users_unified" TO "anon";
GRANT ALL ON TABLE "public"."admin_users_unified" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users_unified" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_history" TO "service_role";



GRANT ALL ON TABLE "public"."call_history" TO "service_role";



GRANT ALL ON TABLE "public"."changelogs" TO "service_role";



GRANT ALL ON TABLE "public"."changelogs_with_creator" TO "anon";
GRANT ALL ON TABLE "public"."changelogs_with_creator" TO "authenticated";
GRANT ALL ON TABLE "public"."changelogs_with_creator" TO "service_role";



GRANT ALL ON TABLE "public"."coin_shop_items" TO "service_role";



GRANT ALL ON TABLE "public"."economy_config" TO "service_role";



GRANT ALL ON TABLE "public"."economy_health_reports" TO "service_role";



GRANT ALL ON TABLE "public"."economy_metrics_daily" TO "service_role";



GRANT ALL ON TABLE "public"."favorite_exp_boost_rules" TO "service_role";



GRANT ALL ON TABLE "public"."level_feature_unlocks" TO "service_role";



GRANT ALL ON TABLE "public"."level_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."public_user_info" TO "anon";
GRANT ALL ON TABLE "public"."public_user_info" TO "authenticated";
GRANT ALL ON TABLE "public"."public_user_info" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."report_contexts" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."streak_exp_bonuses" TO "service_role";



GRANT ALL ON TABLE "public"."user_active_boosts" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_coin_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_details_expanded" TO "anon";
GRANT ALL ON TABLE "public"."user_details_expanded" TO "authenticated";
GRANT ALL ON TABLE "public"."user_details_expanded" TO "service_role";



GRANT ALL ON TABLE "public"."user_exp_daily" TO "service_role";



GRANT ALL ON TABLE "public"."user_exp_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorite_limits" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_level_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."user_monthly_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."user_owned_items" TO "service_role";



GRANT ALL ON TABLE "public"."user_prestige_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_season_records" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings_v" TO "anon";
GRANT ALL ON TABLE "public"."user_settings_v" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings_v" TO "service_role";



GRANT ALL ON TABLE "public"."user_streak_days" TO "service_role";



GRANT ALL ON TABLE "public"."user_streak_freeze_grants" TO "service_role";



GRANT ALL ON TABLE "public"."user_streak_freeze_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."user_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."user_weekly_checkins" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_details" TO "anon";
GRANT ALL ON TABLE "public"."users_with_details" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_details" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







