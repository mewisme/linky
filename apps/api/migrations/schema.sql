


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "public";






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



CREATE OR REPLACE FUNCTION "public"."grant_user_exp_daily_only"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) RETURNS TABLE("exp_earned" bigint, "milestone_600_claimed" boolean, "milestone_1800_claimed" boolean, "milestone_3600_claimed" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_effective_exp bigint;
  v_exp bigint;
  v_600 boolean;
  v_1800 boolean;
  v_3600 boolean;
  v_updated integer;
  v_daily_reward_multiplier double precision := 1.0;
  v_milestone_reward_multiplier numeric(10,4) := 1.0;
  v_reward_600 integer;
  v_reward_1800 integer;
  v_reward_3600 integer;
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;

  v_effective_exp := p_exp_seconds;

  INSERT INTO user_exp_daily (
    user_id,
    date,
    exp_seconds,
    milestone_600_claimed,
    milestone_1800_claimed,
    milestone_3600_claimed
  )
  VALUES (p_user_id, p_date, v_effective_exp, false, false, false)
  ON CONFLICT (user_id, date) DO UPDATE SET
    exp_seconds = user_exp_daily.exp_seconds + v_effective_exp,
    updated_at = now();

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_exp, v_600, v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  SELECT COALESCE((ec.value_json#>>'{}')::numeric, 1.0)
  INTO v_milestone_reward_multiplier
  FROM economy_config ec
  WHERE ec.key = 'milestone_reward_multiplier';

  v_reward_600 := (2 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_1800 := (6 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;
  v_reward_3600 := (12 * v_milestone_reward_multiplier * v_daily_reward_multiplier)::integer;

  IF v_exp >= 600 AND NOT v_600 THEN
    UPDATE user_exp_daily ud
    SET milestone_600_claimed = true
    WHERE ud.user_id = p_user_id
      AND ud.date = p_date
      AND NOT ud.milestone_600_claimed
      AND ud.exp_seconds >= 600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_600, v_reward_600, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_600,
        total_earned = user_wallets.total_earned + v_reward_600;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'daily_milestone',
        v_reward_600,
        'daily_milestone_600',
        jsonb_build_object('local_date', p_date, 'threshold', 600)
      );
    END IF;
  END IF;

  SELECT ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_600, v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  IF v_exp >= 1800 AND NOT v_1800 THEN
    UPDATE user_exp_daily ud
    SET milestone_1800_claimed = true
    WHERE ud.user_id = p_user_id
      AND ud.date = p_date
      AND NOT ud.milestone_1800_claimed
      AND ud.exp_seconds >= 1800;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_1800, v_reward_1800, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_1800,
        total_earned = user_wallets.total_earned + v_reward_1800;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'daily_milestone',
        v_reward_1800,
        'daily_milestone_1800',
        jsonb_build_object('local_date', p_date, 'threshold', 1800)
      );
    END IF;
  END IF;

  SELECT ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO v_1800, v_3600
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  IF v_exp >= 3600 AND NOT v_3600 THEN
    UPDATE user_exp_daily ud
    SET milestone_3600_claimed = true
    WHERE ud.user_id = p_user_id
      AND ud.date = p_date
      AND NOT ud.milestone_3600_claimed
      AND ud.exp_seconds >= 3600;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      INSERT INTO user_wallets (user_id, coin_balance, total_earned, total_spent)
      VALUES (p_user_id, v_reward_3600, v_reward_3600, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        coin_balance = user_wallets.coin_balance + v_reward_3600,
        total_earned = user_wallets.total_earned + v_reward_3600;
      INSERT INTO user_coin_transactions (user_id, type, amount, source, metadata)
      VALUES (
        p_user_id,
        'daily_milestone',
        v_reward_3600,
        'daily_milestone_3600',
        jsonb_build_object('local_date', p_date, 'threshold', 3600)
      );
    END IF;
  END IF;

  SELECT ud.exp_seconds, ud.milestone_600_claimed, ud.milestone_1800_claimed, ud.milestone_3600_claimed
  INTO exp_earned, milestone_600_claimed, milestone_1800_claimed, milestone_3600_claimed
  FROM user_exp_daily ud
  WHERE ud.user_id = p_user_id
    AND ud.date = p_date;

  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."grant_user_exp_daily_only"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."grant_user_exp_daily_only"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) IS 'Updates user_exp_daily and milestones only (no user_levels). Used with increment_user_exp for total.';



CREATE OR REPLACE FUNCTION "public"."grant_user_exp_total"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_effective_exp bigint;
  v_divisor bigint := 2000;
  v_points integer;
  v_config jsonb;
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;

  v_effective_exp := p_exp_seconds;

  INSERT INTO user_levels (user_id, total_exp_seconds)
  VALUES (p_user_id, v_effective_exp)
  ON CONFLICT (user_id)
  DO UPDATE SET total_exp_seconds = GREATEST(0, user_levels.total_exp_seconds + v_effective_exp);

  UPDATE users
  SET lifetime_exp = lifetime_exp + v_effective_exp
  WHERE id = p_user_id;

  SELECT value_json INTO v_config
  FROM economy_config
  WHERE key = 'prestige_divisor';

  IF v_config IS NOT NULL THEN
    v_divisor := (v_config#>>'{}')::bigint;
  END IF;

  IF v_divisor IS NULL OR v_divisor <= 0 THEN
    v_divisor := 2000;
  END IF;

  SELECT floor((SELECT lifetime_exp FROM users WHERE id = p_user_id) / v_divisor)::integer
  INTO v_points;

  UPDATE users
  SET prestige_points = v_points
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."grant_user_exp_total"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."grant_user_exp_total"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") IS 'Updates user_levels, users.lifetime_exp, prestige, user_exp_transactions only (no user_exp_daily).';



CREATE OR REPLACE FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) RETURNS TABLE("exp_earned" bigint, "milestone_600_claimed" boolean, "milestone_1800_claimed" boolean, "milestone_3600_claimed" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_exp_seconds IS NULL OR p_exp_seconds <= 0 THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM grant_user_exp_daily_only(p_user_id, p_date, p_exp_seconds);
END;
$$;


ALTER FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) IS 'Increments daily EXP (with exp_boost multiplier), grants milestone coins (with milestone_reward_multiplier and daily_reward_multiplier), writes exp_transaction.';



CREATE OR REPLACE FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_seconds IS NULL OR p_seconds <= 0 THEN
    RETURN;
  END IF;
  PERFORM grant_user_exp_total(p_user_id, p_seconds, (now() AT TIME ZONE 'UTC')::date, 'call_duration');
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



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."admin_config" (
    "key" "text" NOT NULL,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_config" OWNER TO "postgres";


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
    "embedding" "public"."vector"(1024),
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
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



CREATE TABLE IF NOT EXISTS "public"."economy_config" (
    "key" "text" NOT NULL,
    "value_json" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."economy_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."economy_config" IS 'Tunable economy parameters; value_json holds numeric or small structure.';



CREATE TABLE IF NOT EXISTS "public"."economy_health_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "health_status" "public"."economy_health_status" NOT NULL,
    "metrics_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actions_taken" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."economy_health_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."economy_health_reports" IS 'Daily economy health summary and stabilizer actions.';



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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Stores Web Push API subscriptions for push notifications.';



CREATE TABLE IF NOT EXISTS "public"."report_ai_summaries" (
    "report_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "summary" "text",
    "severity" character varying(20),
    "suggested_action" "text",
    "model" "text",
    "prompt_version" "text",
    "raw_json" "jsonb",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_report_ai_summary_severity" CHECK ((("severity" IS NULL) OR (("severity")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[])))),
    CONSTRAINT "check_report_ai_summary_status" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'ready'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."report_ai_summaries" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_ai_summaries" IS 'AI-generated moderation assist summary for reports (cacheable, non-authoritative).';



COMMENT ON COLUMN "public"."report_ai_summaries"."status" IS 'pending | ready | failed';



COMMENT ON COLUMN "public"."report_ai_summaries"."severity" IS 'low | medium | high | critical';



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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
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



CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_user_id" "uuid" NOT NULL,
    "blocked_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_blocks_different_users" CHECK (("blocker_user_id" <> "blocked_user_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_blocks" IS 'Stores user blocking relationships. Blocking prevents matchmaking, favorites interactions, and incoming calls.';



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
    "updated_at" timestamp with time zone DEFAULT "now"(),
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
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_level_rewards" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_level_rewards" IS 'Tracks which level rewards have been granted to each user';



COMMENT ON COLUMN "public"."user_level_rewards"."user_id" IS 'Foreign key reference to users table';



COMMENT ON COLUMN "public"."user_level_rewards"."level_reward_id" IS 'Foreign key reference to level_rewards table';



COMMENT ON COLUMN "public"."user_level_rewards"."granted_at" IS 'Timestamp when the reward was granted to the user';



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
    "updated_at" timestamp with time zone DEFAULT "now"(),
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
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
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


ALTER TABLE ONLY "public"."admin_config"
    ADD CONSTRAINT "admin_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."broadcast_history"
    ADD CONSTRAINT "broadcast_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_history"
    ADD CONSTRAINT "call_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."economy_config"
    ADD CONSTRAINT "economy_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."economy_health_reports"
    ADD CONSTRAINT "economy_health_reports_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."economy_health_reports"
    ADD CONSTRAINT "economy_health_reports_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."report_ai_summaries"
    ADD CONSTRAINT "report_ai_summaries_pkey" PRIMARY KEY ("report_id");



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "report_contexts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_contexts"
    ADD CONSTRAINT "report_contexts_report_id_key" UNIQUE ("report_id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_unique" UNIQUE ("blocker_user_id", "blocked_user_id");



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



CREATE INDEX "idx_economy_health_reports_date" ON "public"."economy_health_reports" USING "btree" ("date" DESC);



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



CREATE INDEX "idx_streak_exp_bonuses_max_streak" ON "public"."streak_exp_bonuses" USING "btree" ("max_streak");



CREATE INDEX "idx_streak_exp_bonuses_min_streak" ON "public"."streak_exp_bonuses" USING "btree" ("min_streak");



CREATE INDEX "idx_user_details_gender" ON "public"."user_details" USING "btree" ("gender");



CREATE INDEX "idx_user_details_interest_tags" ON "public"."user_details" USING "gin" ("interest_tags");



CREATE INDEX "idx_user_details_languages" ON "public"."user_details" USING "gin" ("languages");



CREATE INDEX "idx_user_details_user_id" ON "public"."user_details" USING "btree" ("user_id");



CREATE INDEX "idx_user_embeddings_embedding_ivfflat" ON "public"."user_embeddings" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='1');



CREATE INDEX "idx_user_embeddings_source_hash" ON "public"."user_embeddings" USING "btree" ("source_hash");



CREATE INDEX "idx_user_embeddings_user_id" ON "public"."user_embeddings" USING "btree" ("user_id");



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



CREATE INDEX "notifications_created_at_idx" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "notifications_is_read_idx" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "notifications_user_id_idx" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "notifications_user_unread_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "user_blocks_blocked_idx" ON "public"."user_blocks" USING "btree" ("blocked_user_id");



CREATE INDEX "user_blocks_blocker_idx" ON "public"."user_blocks" USING "btree" ("blocker_user_id");



CREATE INDEX "user_exp_daily_user_id_date_idx" ON "public"."user_exp_daily" USING "btree" ("user_id", "date");



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."admin_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."broadcast_history" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."call_history" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."economy_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."economy_health_reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."interest_tags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."level_feature_unlocks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."level_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."report_ai_summaries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."report_contexts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."streak_exp_bonuses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_blocks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_embeddings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_exp_daily" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_favorite_limits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_favorites" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_level_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_levels" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_streak_days" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_streak_freeze_grants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_streak_freeze_inventory" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_after_insert_init_settings" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."fn_init_user_settings"();



CREATE OR REPLACE TRIGGER "trigger_create_user_details_on_user_insert" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_details_on_user_insert"();



CREATE OR REPLACE TRIGGER "trigger_create_user_embedding_on_user_insert" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_embedding_on_user_insert"();



CREATE OR REPLACE TRIGGER "trigger_update_call_history_updated_at" BEFORE UPDATE ON "public"."call_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_call_history_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_interest_tags_updated_at" BEFORE UPDATE ON "public"."interest_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_interest_tags_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_level_feature_unlocks_updated_at" BEFORE UPDATE ON "public"."level_feature_unlocks" FOR EACH ROW EXECUTE FUNCTION "public"."update_level_feature_unlocks_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_level_rewards_updated_at" BEFORE UPDATE ON "public"."level_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_level_rewards_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_reports_updated_at" BEFORE UPDATE ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_reports_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_streak_exp_bonuses_updated_at" BEFORE UPDATE ON "public"."streak_exp_bonuses" FOR EACH ROW EXECUTE FUNCTION "public"."update_streak_exp_bonuses_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_details_updated_at" BEFORE UPDATE ON "public"."user_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_details_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_embeddings_updated_at" BEFORE UPDATE ON "public"."user_embeddings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_embeddings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_levels_updated_at" BEFORE UPDATE ON "public"."user_levels" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_levels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_streaks_updated_at" BEFORE UPDATE ON "public"."user_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_streaks_updated_at"();



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



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "fk_user_details_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_embeddings"
    ADD CONSTRAINT "fk_user_embeddings_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "fk_user_level_rewards_reward" FOREIGN KEY ("level_reward_id") REFERENCES "public"."level_rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_level_rewards"
    ADD CONSTRAINT "fk_user_level_rewards_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_levels"
    ADD CONSTRAINT "fk_user_levels_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_ai_summaries"
    ADD CONSTRAINT "report_ai_summaries_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



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



ALTER TABLE "public"."admin_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."economy_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_ai_summaries" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."s3vec_in"("input" "cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."s3vec_in"("input" "cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."s3vec_in"("input" "cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3vec_in"("input" "cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."s3vec_out"("input" "public"."s3vec") TO "postgres";
GRANT ALL ON FUNCTION "public"."s3vec_out"("input" "public"."s3vec") TO "anon";
GRANT ALL ON FUNCTION "public"."s3vec_out"("input" "public"."s3vec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3vec_out"("input" "public"."s3vec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."airtable_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."airtable_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."airtable_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."airtable_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."airtable_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."airtable_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."airtable_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."airtable_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."airtable_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."airtable_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."airtable_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."airtable_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auth0_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."auth0_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth0_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth0_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth0_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."auth0_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth0_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth0_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth0_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."auth0_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth0_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth0_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."big_query_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."big_query_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."big_query_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."big_query_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."big_query_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."big_query_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."big_query_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."big_query_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."big_query_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."big_query_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."big_query_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."big_query_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."click_house_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."click_house_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."click_house_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."click_house_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."click_house_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."click_house_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."click_house_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."click_house_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."click_house_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."click_house_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."click_house_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."click_house_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cognito_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."cognito_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."cognito_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cognito_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cognito_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."cognito_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."cognito_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cognito_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cognito_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."cognito_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."cognito_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cognito_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_details_on_user_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_embedding_on_user_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."duckdb_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."duckdb_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."duckdb_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."duckdb_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer, "p_threshold" double precision, "p_exclude_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer, "p_threshold" double precision, "p_exclude_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_users_by_embedding"("p_user_id" "uuid", "p_limit" integer, "p_threshold" double precision, "p_exclude_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."firebase_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."firebase_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."firebase_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."firebase_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."firebase_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."firebase_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."firebase_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."firebase_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."firebase_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."firebase_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."firebase_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."firebase_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_exp_to_level"("p_total_exp_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_init_user_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_user_details_timezone_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_user_details_timezone_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_user_details_timezone_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_user_exp"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_user_exp_daily_only"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."grant_user_exp_daily_only"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_user_exp_daily_only"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_user_exp_total"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."grant_user_exp_total"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_user_exp_total"("p_user_id" "uuid", "p_exp_seconds" bigint, "p_date" "date", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hello_world_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hello_world_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hello_world_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hello_world_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."iceberg_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."iceberg_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."iceberg_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."iceberg_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_daily_exp_with_milestones"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_exp"("p_user_id" "uuid", "p_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_exp_daily"("p_user_id" "uuid", "p_date" "date", "p_exp_seconds" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."logflare_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."logflare_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."logflare_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."logflare_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."logflare_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."logflare_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."logflare_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."logflare_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."logflare_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."logflare_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."logflare_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."logflare_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."metadata_filter"("_left" "jsonb", "_right" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."metadata_filter"("_left" "jsonb", "_right" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."metadata_filter"("_left" "jsonb", "_right" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."metadata_filter"("_left" "jsonb", "_right" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mssql_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."mssql_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."mssql_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mssql_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mssql_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."mssql_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."mssql_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mssql_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mssql_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."mssql_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."mssql_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mssql_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."redis_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."redis_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."redis_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."redis_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."redis_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."redis_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."redis_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."redis_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."redis_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."redis_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."redis_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redis_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."s3_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."s3_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."s3_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."s3_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."s3_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."s3_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."s3_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."s3_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."s3_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3_vectors_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."s3vec_distance"("s3vec" "public"."s3vec") TO "postgres";
GRANT ALL ON FUNCTION "public"."s3vec_distance"("s3vec" "public"."s3vec") TO "anon";
GRANT ALL ON FUNCTION "public"."s3vec_distance"("s3vec" "public"."s3vec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3vec_distance"("s3vec" "public"."s3vec") TO "service_role";



GRANT ALL ON FUNCTION "public"."s3vec_knn"("_left" "public"."s3vec", "_right" "public"."s3vec") TO "postgres";
GRANT ALL ON FUNCTION "public"."s3vec_knn"("_left" "public"."s3vec", "_right" "public"."s3vec") TO "anon";
GRANT ALL ON FUNCTION "public"."s3vec_knn"("_left" "public"."s3vec", "_right" "public"."s3vec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."s3vec_knn"("_left" "public"."s3vec", "_right" "public"."s3vec") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."stripe_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."stripe_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."stripe_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."stripe_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."stripe_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."stripe_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."stripe_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."stripe_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."stripe_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."stripe_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."stripe_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."stripe_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_streak_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_call_history_updated_at"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak_summary"("p_user_id" "uuid", "p_date" "date", "p_is_valid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streaks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_user_streak_day"("p_user_id" "uuid", "p_date" "date", "p_total_call_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."wasm_fdw_handler"() TO "postgres";
GRANT ALL ON FUNCTION "public"."wasm_fdw_handler"() TO "anon";
GRANT ALL ON FUNCTION "public"."wasm_fdw_handler"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."wasm_fdw_handler"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wasm_fdw_meta"() TO "postgres";
GRANT ALL ON FUNCTION "public"."wasm_fdw_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."wasm_fdw_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."wasm_fdw_meta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wasm_fdw_validator"("options" "text"[], "catalog" "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."wasm_fdw_validator"("options" "text"[], "catalog" "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."wasm_fdw_validator"("options" "text"[], "catalog" "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wasm_fdw_validator"("options" "text"[], "catalog" "oid") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."admin_config" TO "service_role";



GRANT ALL ON TABLE "public"."interest_tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_details" TO "service_role";



GRANT ALL ON TABLE "public"."user_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."user_levels" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users_unified" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_history" TO "service_role";



GRANT ALL ON TABLE "public"."call_history" TO "service_role";



GRANT ALL ON TABLE "public"."economy_config" TO "service_role";



GRANT ALL ON TABLE "public"."economy_health_reports" TO "service_role";



GRANT ALL ON TABLE "public"."level_feature_unlocks" TO "service_role";



GRANT ALL ON TABLE "public"."level_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."public_user_info" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."report_ai_summaries" TO "anon";
GRANT ALL ON TABLE "public"."report_ai_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."report_ai_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."report_contexts" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."streak_exp_bonuses" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_details_expanded" TO "service_role";



GRANT ALL ON TABLE "public"."user_exp_daily" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorite_limits" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."user_favorites_with_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_level_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings_v" TO "service_role";



GRANT ALL ON TABLE "public"."user_streak_days" TO "service_role";



GRANT ALL ON TABLE "public"."user_streak_freeze_grants" TO "service_role";



GRANT ALL ON TABLE "public"."user_streak_freeze_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_details" TO "service_role";



GRANT ALL ON TABLE "public"."wrappers_fdw_stats" TO "postgres";
GRANT ALL ON TABLE "public"."wrappers_fdw_stats" TO "anon";
GRANT ALL ON TABLE "public"."wrappers_fdw_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."wrappers_fdw_stats" TO "service_role";









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



































