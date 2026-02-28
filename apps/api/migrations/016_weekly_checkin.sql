CREATE OR REPLACE FUNCTION "public"."update_user_weekly_checkins_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_user_weekly_checkins_updated_at"() OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."user_weekly_checkins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "streak_day" integer NOT NULL DEFAULT 0,
    "last_checkin_local_date" date,
    "total_weeks_completed" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_weekly_checkins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_weekly_checkins_user_id_key" UNIQUE ("user_id")
);

ALTER TABLE "public"."user_weekly_checkins" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_weekly_checkins" IS 'Weekly check-in streak and reward state per user.';

CREATE INDEX IF NOT EXISTS "idx_user_weekly_checkins_user_id" ON "public"."user_weekly_checkins" ("user_id");

CREATE OR REPLACE TRIGGER "trigger_update_user_weekly_checkins_updated_at"
  BEFORE UPDATE ON "public"."user_weekly_checkins"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_user_weekly_checkins_updated_at"();

ALTER TABLE ONLY "public"."user_weekly_checkins"
    ADD CONSTRAINT "fk_user_weekly_checkins_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" date)
RETURNS TABLE(
  "streak_day" integer,
  "reward" integer,
  "new_coin_balance" integer
)
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

ALTER FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" date) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" date) IS 'Claims weekly check-in for local date. Idempotent per day; resets if gap > 1 day.';

GRANT ALL ON TABLE "public"."user_weekly_checkins" TO "anon";
GRANT ALL ON TABLE "public"."user_weekly_checkins" TO "authenticated";
GRANT ALL ON TABLE "public"."user_weekly_checkins" TO "service_role";

GRANT ALL ON FUNCTION "public"."update_user_weekly_checkins_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_weekly_checkins_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_weekly_checkins_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" date) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" date) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_weekly_checkin"("p_user_id" "uuid", "p_local_date" date) TO "service_role";
