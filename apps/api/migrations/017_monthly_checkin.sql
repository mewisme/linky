CREATE OR REPLACE FUNCTION "public"."update_user_monthly_checkins_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_user_monthly_checkins_updated_at"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_monthly_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "claimed_days" integer[] NOT NULL DEFAULT '{}',
    "buyback_count" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_monthly_checkins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_monthly_checkins_user_id_year_month_key" UNIQUE ("user_id", "year", "month")
);

ALTER TABLE "public"."user_monthly_checkins" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_monthly_checkins" IS 'Monthly check-in claimed days and buyback count per user per month.';

CREATE INDEX IF NOT EXISTS "idx_user_monthly_checkins_user_year_month" ON "public"."user_monthly_checkins" ("user_id", "year", "month");

CREATE OR REPLACE TRIGGER "trigger_update_user_monthly_checkins_updated_at"
  BEFORE UPDATE ON "public"."user_monthly_checkins"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_user_monthly_checkins_updated_at"();

ALTER TABLE ONLY "public"."user_monthly_checkins"
    ADD CONSTRAINT "fk_user_monthly_checkins_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer)
RETURNS integer
LANGUAGE "plpgsql"
IMMUTABLE
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

CREATE OR REPLACE FUNCTION "public"."claim_monthly_checkin"(
  "p_user_id" "uuid",
  "p_year" integer,
  "p_month" integer,
  "p_day" integer,
  "p_today_day" integer
)
RETURNS TABLE("reward" integer, "new_coin_balance" integer)
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

CREATE OR REPLACE FUNCTION "public"."buyback_cost_for_index"("p_index" integer)
RETURNS integer
LANGUAGE "plpgsql"
IMMUTABLE
AS $$
BEGIN
  IF p_index <= 0 THEN RETURN 300; END IF;
  IF p_index = 1 THEN RETURN 400; END IF;
  IF p_index = 2 THEN RETURN 600; END IF;
  RETURN 800;
END;
$$;

ALTER FUNCTION "public"."buyback_cost_for_index"("p_index" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."claim_monthly_buyback"(
  "p_user_id" "uuid",
  "p_year" integer,
  "p_month" integer,
  "p_day" integer,
  "p_today_day" integer
)
RETURNS TABLE("exp_spent" integer, "reward" integer, "new_coin_balance" integer)
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

COMMENT ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) IS 'Claims monthly check-in for a day. Day must be in month and not future.';
COMMENT ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) IS 'Buyback a missed day with EXP. Progressive cost.';

GRANT ALL ON TABLE "public"."user_monthly_checkins" TO "anon";
GRANT ALL ON TABLE "public"."user_monthly_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."user_monthly_checkins" TO "service_role";

GRANT ALL ON FUNCTION "public"."update_user_monthly_checkins_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_monthly_checkins_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_monthly_checkins_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."monthly_reward_for_day"("p_day" integer, "p_days_in_month" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."buyback_cost_for_index"("p_index" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_monthly_checkin"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_monthly_buyback"("p_user_id" "uuid", "p_year" integer, "p_month" integer, "p_day" integer, "p_today_day" integer) TO "service_role";
